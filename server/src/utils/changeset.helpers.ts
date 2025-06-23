export const removeNaN = (num: number) => (isNaN(num) ? null : num);

export const enforceEnum = <T extends string[]>(str: string, values: T): T[number] | null => {
	if (!values.includes(str)) return null;
	return str;
};

export const genDiffer = <Select extends Insert, Insert extends object>(
	inventoryKeys: (keyof Insert)[],
	diffKeys: (keyof Insert)[]
) => {
	return (
		prev: Select,
		next: Insert
	): {
		diff: Partial<Insert>;
		type: 'nop' | 'inventory' | 'more';
	} => {
		const diff: Partial<Insert> = {};
		let type: 'nop' | 'inventory' | 'more' = 'nop';
		diffKeys.forEach((key) => {
			if (prev[key] !== next[key]) {
				diff[key] = next[key] as any;
				type = type !== 'more' ? (inventoryKeys.includes(key) ? 'inventory' : 'more') : 'more';
			}
		});
		return {
			type,
			diff
		};
	};
};
