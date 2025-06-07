export function validateCustomValue(value: string | null | undefined, cellType: 'string' | 'number' | 'boolean', nullable: boolean): { res: string | null | undefined, error: string | null } {
    if (!value) value = '';

    // Handle null/empty cases
    if (value.toLowerCase() === "null") {
        if (nullable) {
            return { res: null, error: null };
        } else {
            return { res: undefined, error: 'This field cannot be Null' + (nullable ? ' or Null' : '') };
        }
    }


    switch (cellType) {
        case 'string':
            return { res: value, error: null };

        case 'number': {
            const numValue = Number(value);
            if (isNaN(numValue) || !isFinite(numValue)) {
                return { res: undefined, error: 'Value must be a valid number' + (nullable ? ' or Null' : '') };
            }
            if (Math.round(numValue) !== numValue) {
                return { res: undefined, error: 'Value must be an integer (whole number)' + (nullable ? ' or Null' : '') };
            }
            return { res: value, error: null };
        }

        case 'boolean': {
            const lowerValue = value.toLowerCase();
            if (lowerValue === 'true') {
                return { res: 'true', error: null };
            } else if (lowerValue === 'false') {
                return { res: 'false', error: null };
            } else {
                return { res: undefined, error: 'Value must be true or false' + (nullable ? ' or Null' : '') };
            }
        }
        default:
            return { res: undefined, error: 'Unknown cell type' };
    }
}

export function objectsEqual<T extends object, U extends object>(obj1: T | U | null | undefined, obj2: U | T | null | undefined, exclude: (keyof (T & U))[]): boolean {
    console.log("Comparing objects:", obj1, obj2, "with exclude:", exclude);
    if (
        typeof obj1 !== "object" ||
        !obj1 ||
        typeof obj2 !== "object" ||
        !obj2
    ) {
        return false;
    }

    const keys1 = Object.keys(obj1).filter(key => !exclude.includes(key as keyof (T & U)));
    const keys2 = Object.keys(obj2).filter(key => !exclude.includes(key as keyof (T & U)));

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (!keys2.includes(key) || obj1[key as keyof typeof obj1] !== obj2[key as keyof typeof obj2]) {
            return false;
        }
    }

    return true;
}