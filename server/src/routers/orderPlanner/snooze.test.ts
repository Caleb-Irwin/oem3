import { describe, expect, test } from 'bun:test';
import { calendarSnoozeUntil, stockoutSnoozeUntil } from './snooze';

describe('Smart Order snooze presets', () => {
	test('clamps a month from the end of a long month', () => {
		const now = new Date('2026-01-31T12:00:00.000Z').getTime();
		expect(new Date(calendarSnoozeUntil(now, 1)).toISOString()).toBe('2026-02-28T12:00:00.000Z');
	});

	test('only permits a future projected run-out', () => {
		const now = Date.parse('2026-09-03T12:00:00.000Z');
		expect(stockoutSnoozeUntil(now, now + 86400000)).toBe(now + 86400000);
		expect(stockoutSnoozeUntil(now, now)).toBeNull();
		expect(stockoutSnoozeUntil(now, null)).toBeNull();
	});
});
