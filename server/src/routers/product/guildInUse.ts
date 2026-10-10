import { and, eq, isNull, not, or } from 'drizzle-orm';
import { unifiedGuild, unifiedProduct, unifiedSpr } from '../../db.schema';

/**
 * The product's Guild row, unless it is deleted and a live Novexco item can replace it. Deleted
 * Guild rows stay linked (the unifier never removes the primary link) but stop updating, so their
 * prices and content go stale. Without a live Novexco item the product is deleted anyway, and the
 * Guild row's last data is all it has.
 */
export function guildInUse<Guild extends { deleted: boolean }>(
	guild: Guild | null | undefined,
	spr: { deleted: boolean } | null | undefined
): Guild | null {
	return guild && (!guild.deleted || !spr || spr.deleted) ? guild : null;
}

/** Join condition for the product's Guild row under the same rule. Join unifiedSpr first. */
export const guildInUseJoin = and(
	eq(unifiedGuild.id, unifiedProduct.unifiedGuildRow),
	or(not(unifiedGuild.deleted), isNull(unifiedSpr.id), eq(unifiedSpr.deleted, true))
);
