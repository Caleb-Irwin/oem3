export default function divideArray<T>(arr: T[], size: number): T[][] {
	if (arr.length === 0) {
		return arr as [];
	}
	return [arr.slice(0, size), ...divideArray(arr.slice(size), size)];
}
