import { TRPCError } from '@trpc/server';
import { and, eq, inArray, not, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { generalProcedure, router } from '../../trpc';
import { isCloudDownloadActive, runCloudDownload } from '../../utils/files';
import { isWorkerBusy } from '../../utils/managedWorker';
import { unifiedProduct } from '../product/table';
import { shopifyConnect } from './connect';
import { generateHandle } from './push/pushConvert';
import { shopify } from './table';

/** A product and its Shopify listing, as far as handles are concerned */
export interface HandleCandidate {
	id: number;
	title: string | null;
	gid: string | null;
	sprc: string | null;
	novexco: string | null;
	listing: { productId: string; handle: string; deleted: boolean } | null;
}

export type HandlePlan = { code: string } & (
	| { status: 'notFound' | 'ambiguous' }
	| { status: 'noListing' | 'noTitle'; productId: number; title: string | null }
	| {
			status: 'unchanged' | 'change';
			productId: number;
			title: string | null;
			shopifyProductId: string;
			currentHandle: string;
			newHandle: string;
	  }
);

const matches = (code: string, value: string | null | undefined) =>
	!!value && value.toLowerCase() === code.toLowerCase();

/**
 * What regenerating would do for each code. A code is a product's Novexco, SPR or Guild code, or
 * its listing's current handle. A listing only gets its handle from its title when it is created
 * (see generateHandle), so a listing whose product was first matched to the wrong content keeps
 * that product's name in its URL until it is regenerated.
 */
export function planHandleChanges(codes: string[], candidates: HandleCandidate[]): HandlePlan[] {
	const seenProducts = new Set<number>();
	return Array.from(new Set(codes.map((c) => c.trim()).filter(Boolean))).flatMap(
		(code): HandlePlan[] => {
			const found = candidates.filter(
				(c) =>
					matches(code, c.novexco) ||
					matches(code, c.sprc) ||
					matches(code, c.gid) ||
					(!!c.listing && !c.listing.deleted && matches(code, c.listing.handle))
			);
			if (found.length === 0) return [{ code, status: 'notFound' }];
			if (found.length > 1) return [{ code, status: 'ambiguous' }];
			const [product] = found;
			// The same product named twice, e.g. by its Novexco and its SPR code
			if (seenProducts.has(product.id)) return [];
			seenProducts.add(product.id);

			const base = { code, productId: product.id, title: product.title };
			if (!product.listing || product.listing.deleted) return [{ ...base, status: 'noListing' }];
			const newHandle = generateHandle(product);
			if (!newHandle) return [{ ...base, status: 'noTitle' }];
			return [
				{
					...base,
					status: newHandle === product.listing.handle ? 'unchanged' : 'change',
					shopifyProductId: product.listing.productId,
					currentHandle: product.listing.handle,
					newHandle
				}
			];
		}
	);
}

async function getPlan(codes: string[]): Promise<HandlePlan[]> {
	// Codes are stored in upper case and handles in lower case
	const variants = Array.from(new Set(codes.flatMap((c) => [c, c.toUpperCase(), c.toLowerCase()])));
	const rows = await db
		.select({
			id: unifiedProduct.id,
			title: unifiedProduct.title,
			gid: unifiedProduct.gid,
			sprc: unifiedProduct.sprc,
			novexco: unifiedProduct.novexco,
			shopifyProductId: shopify.productId,
			handle: shopify.handle,
			listingDeleted: shopify.deleted
		})
		.from(unifiedProduct)
		.leftJoin(shopify, eq(unifiedProduct.shopifyRow, shopify.id))
		.where(
			and(
				not(unifiedProduct.deleted),
				or(
					inArray(unifiedProduct.novexco, variants),
					inArray(unifiedProduct.sprc, variants),
					inArray(unifiedProduct.gid, variants),
					inArray(shopify.handle, variants)
				)
			)
		);
	return planHandleChanges(
		codes,
		rows.map((row) => ({
			id: row.id,
			title: row.title,
			gid: row.gid,
			sprc: row.sprc,
			novexco: row.novexco,
			listing:
				row.shopifyProductId && row.handle
					? {
							productId: row.shopifyProductId,
							handle: row.handle,
							deleted: row.listingDeleted ?? false
						}
					: null
		}))
	);
}

const updateHandleMutation = `#graphql
	mutation regenerateProductHandle($product: ProductUpdateInput!) {
		productUpdate(product: $product) {
			product {
				id
				handle
			}
			userErrors {
				field
				message
			}
		}
	}
`;

interface UpdateHandleResult {
	productUpdate?: {
		product?: { id: string; handle: string } | null;
		userErrors: { field?: string[] | null; message: string }[];
	} | null;
}

export type HandleResult = HandlePlan & { error?: string; handle?: string };

const codesInput = z.object({
	codes: z.array(z.string().trim().min(1).max(256)).min(1).max(200)
});

export const shopifyHandlesRouter = router({
	preview: generalProcedure
		.input(codesInput)
		.query(async ({ input: { codes } }) => await getPlan(codes)),
	regenerate: generalProcedure
		.input(codesInput)
		.mutation(async ({ input: { codes }, ctx }): Promise<HandleResult[]> => {
			// A push sends each listing's handle as last pulled, and a pull in progress could have read
			// it before the change, so either would put the old handle back
			if (
				isWorkerBusy('shopifyPush') ||
				isWorkerBusy('shopify') ||
				isCloudDownloadActive('shopify')
			) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'A Shopify push or pull is running. Try again once it has finished.'
				});
			}

			const plan = await getPlan(codes);
			const { client } = shopifyConnect();
			const results: HandleResult[] = [];
			let changed = 0;

			for (const item of plan) {
				if (item.status !== 'change') {
					results.push(item);
					continue;
				}
				try {
					const res = await client.request<UpdateHandleResult>(updateHandleMutation, {
						variables: {
							product: {
								id: item.shopifyProductId,
								handle: item.newHandle,
								// Old links and search results keep working
								redirectNewHandle: true
							}
						}
					});
					const update = res.data?.productUpdate;
					const errors = update?.userErrors ?? [];
					if (errors.length > 0 || !update?.product) {
						results.push({
							...item,
							error: errors.map((e) => e.message).join('; ') || 'Shopify returned no product'
						});
						continue;
					}
					// Shopify may adjust the handle, e.g. when another product already has it. Saved now
					// so the next push sends it without waiting for the pull.
					await db
						.update(shopify)
						.set({ handle: update.product.handle })
						.where(eq(shopify.productId, item.shopifyProductId));
					changed++;
					results.push({ ...item, handle: update.product.handle });
				} catch (e) {
					results.push({ ...item, error: e instanceof Error ? e.message : String(e) });
				}
			}

			console.log(
				`${ctx.user.username} regenerated ${changed} Shopify handle(s): ` +
					results
						.filter((r) => r.handle)
						.map((r) => `${r.code} -> ${r.handle}`)
						.join(', ')
			);
			// Pulls the listings' new URLs
			if (changed > 0) {
				runCloudDownload('shopify', { user: { username: ctx.user.username } }).catch((e) =>
					console.error('Downloading Shopify changes after regenerating handles failed:', e)
				);
			}
			return results;
		})
});
