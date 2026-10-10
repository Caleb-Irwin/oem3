import { describe, expect, test } from 'bun:test';
import { guildInUse } from './guildInUse';

const live = { deleted: false };
const deleted = { deleted: true };

describe('guildInUse', () => {
	test('uses a live Guild row whatever Novexco has', () => {
		expect(guildInUse(live, live)).toBe(live);
		expect(guildInUse(live, deleted)).toBe(live);
		expect(guildInUse(live, null)).toBe(live);
	});

	test('replaces a deleted Guild row with a live Novexco item', () => {
		expect(guildInUse(deleted, live)).toBeNull();
	});

	test('keeps a deleted Guild row when nothing can replace it', () => {
		expect(guildInUse(deleted, deleted)).toBe(deleted);
		expect(guildInUse(deleted, null)).toBe(deleted);
	});

	test('has nothing to use without a Guild row', () => {
		expect(guildInUse(null, live)).toBeNull();
		expect(guildInUse(undefined, null)).toBeNull();
	});
});
