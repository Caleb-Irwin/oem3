import { z } from 'zod';
import { router, viewerProcedure } from '../trpc';
import { db } from '../db';
import { desc, eq } from 'drizzle-orm';
import {
	changesets,
	changesetType,
	guildDescriptions,
	history,
	resourceTypeEnum,
	sprEnhancedContent,
	uniref,
	unmatchedErrors,
	type ResourceType
} from '../db.schema';
import { TRPCError } from '@trpc/server';
import { addOrSmartUpdateImage, getAccessURLBySourceURL } from '../utils/images';
import { eventSubscription } from '../utils/eventSubscription';
import { ColToTableName } from './unified.helpers';

const unifiedGuildDataWith = {
	with: {
		unifiedGuildData: {
			with: {
				uniref: true as true
			}
		}
	}
};

const unifiedSprDataWith = {
	with: {
		unifiedSprData: {
			with: {
				uniref: true as true
			}
		}
	}
};

export const resourceWith = {
	changesetData: true as true,
	qbData: true as true,
	guildData: unifiedGuildDataWith,
	guildInventoryData: unifiedGuildDataWith,
	guildFlyerData: unifiedGuildDataWith,
	shopifyData: true as true,
	sprPriceFileData: unifiedSprDataWith,
	sprFlatFileData: unifiedSprDataWith,
	unifiedGuildData: true as true,
	unifiedSprData: true as true
};

export const getResource = async ({
	input: { uniId, type, id, includeHistory, includeAllowUnmatched }
}: {
	input: {
		uniId: number;
		type?: string;
		id?: number;
		includeHistory: boolean;
		includeAllowUnmatched: boolean;
	};
}) => {
	if (uniId === -1 && type && id) {
		const maybeUniId = (
			await db.query.uniref.findFirst({
				where: eq(uniref[type as ResourceType], id)
			})
		)?.uniId;

		if (!maybeUniId)
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'UniId Item Not Found'
			});
		uniId = maybeUniId;
	}

	const getRes = async () =>
		(await db.query.uniref.findFirst({
			where: eq(uniref.uniId, uniId),
			with: resourceWith
		})) ?? null;
	const getHistory = async () => {
		if (includeHistory) {
			return await db.query.history.findMany({
				where: eq(history.uniref, uniId),
				orderBy: desc(history.id)
			});
		}
		return null;
	};
	const getAllowUnmatched = async () => {
		if (includeAllowUnmatched) {
			const unmatched = await db.query.unmatchedErrors.findFirst({
				where: eq(unmatchedErrors.uniId, uniId),
				orderBy: desc(unmatchedErrors.id)
			});
			return unmatched ? unmatched.allowUnmatched : false;
		}
		return null;
	};

	const [res, historyRes, allowUnmatchedRes] = await Promise.all([
		getRes(),
		getHistory(),
		getAllowUnmatched()
	]);

	return { history: historyRes, allowUnmatched: allowUnmatchedRes, ...res };
};

const { update, createSub } = eventSubscription();
export const updateByChangesetType = update;

export const resourcesRouter = router({
	get: viewerProcedure
		.input(
			z.object({
				uniId: z.number().int(),
				type: z.enum(resourceTypeEnum.enumValues).optional(),
				id: z.number().int().optional(),
				includeHistory: z.boolean().default(false),
				includeAllowUnmatched: z.boolean().default(false)
			})
		)
		.query(getResource),
	getSub: createSub<
		{
			uniId: number;
			type?: string;
			id?: number;
			includeHistory: boolean;
			includeAllowUnmatched: boolean;
		},
		Awaited<ReturnType<typeof getResource>>
	>(async ({ input }) => {
		return await getResource({ input });
	}),
	getChangesets: viewerProcedure
		.input(z.object({ type: z.enum(changesetType.enumValues) }))
		.query(async ({ input: { type } }) => {
			return (
				await Promise.all(
					(
						await db.query.changesets.findMany({
							where: eq(changesets.type, type),
							with: {
								uniref: true
							},
							orderBy: desc(changesets.created)
						})
					).map(async (line) => {
						if (!line.uniref) return;
						return await db.query.history.findFirst({
							where: eq(history.uniref, line.uniref.uniId)
						});
					})
				)
			).filter((v) => typeof v === 'object');
		}),
	getUniId: viewerProcedure
		.input(
			z.object({
				type: z.enum(resourceTypeEnum.enumValues),
				id: z.number().int()
			})
		)
		.query(async ({ input: { id, type } }) => {
			return await db.query.uniref.findFirst({
				where: eq(uniref[type], id)
			});
		}),
	getResourceByCol: viewerProcedure
		.input(z.object({ col: z.string(), value: z.number() }))
		.query(async ({ input: { col, value } }) => {
			return await getResourceByCol(col, value);
		}),
	getResourceByColSub: createSub<
		{ col: string; value: number },
		Awaited<ReturnType<typeof getResourceByCol>>
	>(async ({ input: { col, value } }) => {
		return await getResourceByCol(col, value);
	}),
	sprEnhancedContent: viewerProcedure
		.input(
			z.object({
				etilizeId: z.string().optional(),
				gid: z.string().optional()
			})
		)
		.query(
			async ({
				input: { etilizeId, gid }
			}): Promise<{
				guild: typeof guildDescriptions.$inferSelect | undefined;
				spr: typeof sprEnhancedContent.$inferSelect | undefined;
			}> => {
				if (etilizeId) {
					return {
						guild: undefined,
						spr: await db.query.sprEnhancedContent.findFirst({
							where: eq(sprEnhancedContent.etilizeId, etilizeId)
						})
					};
				} else if (gid) {
					return {
						guild: await db.query.guildDescriptions.findFirst({
							where: eq(guildDescriptions.gid, gid)
						}),
						spr: undefined
					};
				}
				return {
					guild: undefined,
					spr: undefined
				};
			}
		),
	getImageUrl: viewerProcedure
		.input(z.object({ originalURL: z.string(), thumbnail: z.boolean().default(false) }))
		.query(async ({ input: { originalURL, thumbnail } }) => {
			const gid = originalURL.startsWith('https://shopofficeonline.com/ProductImages/')
				? originalURL
						.slice(
							originalURL.indexOf('https://shopofficeonline.com/ProductImages/') + 43,
							originalURL.indexOf('.jpg')
						)
						.replace(/[\W_]+/g, '')
				: null;
			if (gid) originalURL = `https://shopofficeonline.com/ProductImages/${gid}.jpg`;

			const imageURL = await getAccessURLBySourceURL(originalURL, thumbnail);
			if (imageURL) return imageURL;

			if (gid) {
				await addOrSmartUpdateImage(
					`https://shopofficeonline.com/ProductImages/${gid.replace(/[\W_]+/g, '')}.jpg`,
					gid,
					'shopofficeonline',
					true
				);
				const potentialNewURL = await getAccessURLBySourceURL(originalURL, thumbnail);
				if (potentialNewURL) return potentialNewURL;
			}

			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Image not found'
			});
		})
});

export async function getResourceByCol(col: string, value: string | number | boolean | null) {
	if (!Object.hasOwn(ColToTableName, col)) return undefined;
	if (value === null) return null;
	const tableName = ColToTableName[col as keyof typeof ColToTableName];
	return await getResource({
		input: {
			uniId: -1,
			type: tableName,
			id: value as number,
			includeHistory: false,
			includeAllowUnmatched: false
		}
	});
}
