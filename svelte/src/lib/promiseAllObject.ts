/**
 * Takes a keyed object of promises and returns a promise that resolves to an object
 * with the same keys, where values are the resolved values of the corresponding promises.
 *
 * If any of the input promises reject, the returned promise will reject with the
 * error from the first promise that rejected. This behavior is similar to `Promise.all`.
 *
 * @template T - An object type where keys are strings and values are the expected
 *               resolved types of the promises.
 * @param promisesMap - An object where keys are strings and values are Promises.
 *                      The resolved type of each promise should correspond to the
 *                      type specified in `T` for that key.
 *                      Example: `{ a: Promise<string>, b: Promise<number> }`
 * @returns A promise that resolves to an object with the same keys as `promisesMap`,
 *          and values being the resolved values of the promises.
 *          Example: `Promise<{ a: string, b: number }>`
 * @throws Rejects with the error of the first promise that rejects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function promiseAllObject<T extends Record<string, any>>(
    promisesMap: { [K in keyof T]: Promise<T[K]> },
): Promise<T> {
    const keys = Object.keys(promisesMap) as Array<keyof T>;

    const promiseList: Array<Promise<T[keyof T]>> = keys.map(
        (key) => promisesMap[key],
    );

    const resolvedValuesList = await Promise.all(promiseList);

    const result = {} as T; // Initialize as T.

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]; // `key` is of type `keyof T`
        const resolvedValue = resolvedValuesList[i]; // `resolvedValue` is typed as `T[keyof T]`
        result[key] = resolvedValue as T[keyof T];
    }

    return result;
}
