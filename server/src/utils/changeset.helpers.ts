export const removeNaN = (num: number) => (isNaN(num) ? null : num);

export const enforceEnum = <T extends string[]>(
  str: string,
  values: T
): T[number] | null => {
  if (!values.includes(str)) return null;
  return str;
};

export const genDiffer = <Select extends Insert, Insert extends object>(
  inventoryKey: keyof Insert,
  diffKeys: (keyof Insert)[]
) => {
  return (
    prev: Select,
    next: Insert
  ): {
    diff: Partial<Insert>;
    type: "nop" | "inventory" | "more";
  } => {
    const diff: Partial<Insert> = {};
    let type: "nop" | "inventory" | "more" = "nop";
    if (prev[inventoryKey] !== next[inventoryKey]) {
      diff[inventoryKey] = next[inventoryKey];
      type = "inventory";
    }
    diffKeys.forEach((key) => {
      if (prev[key] !== next[key]) {
        diff[key] = next[key] as any;
        type = "more";
      }
    });
    return {
      type,
      diff,
    };
  };
};
