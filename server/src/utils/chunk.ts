export function chunk<T>(arr: T[]): T[][] {
	return arr.reduce((res, item, i) => {
		if (i % 200 !== 0) {
			res[res.length - 1].push(item);
		} else {
			res.push([item]);
		}
		return res;
	}, [] as T[][]);
}
