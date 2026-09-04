/** Returns a calendar-month date without overflowing short target months. */
export function calendarSnoozeUntil(now: number, months: 1 | 3) {
	const date = new Date(now);
	const day = date.getDate();
	date.setDate(1);
	date.setMonth(date.getMonth() + months);
	const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	date.setDate(Math.min(day, lastDay));
	return date.getTime();
}

export function stockoutSnoozeUntil(now: number, projectedStockoutAt: number | null) {
	return projectedStockoutAt !== null && projectedStockoutAt > now ? projectedStockoutAt : null;
}
