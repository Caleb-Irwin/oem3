import { eq, inArray } from "drizzle-orm";
import { db as DB, type Tx } from "../db";
import { unifiedGuildCellConfig, type CellSetting } from "../db.schema";
import type { UnifiedTables } from "./unifier";

type CellConfigTable = typeof unifiedGuildCellConfig;

export async function createCellConfigurator(
  table: CellConfigTable,
  id: number,
  db: typeof DB | Tx
) {
  const cellConfigs = await db.select().from(table).where(eq(table.refId, id));
  type CellConfig = (typeof cellConfigs)[number];

  const groupedConfigs = cellConfigs.reduce((acc, config) => {
    const col = config.col;
    if (!acc[col]) {
      acc[col] = [];
    }
    acc[col].push(config);
    return acc;
  }, {} as Record<string, typeof cellConfigs>);

  const newErrors: CellConfigRowInsert[] = [];

  function getCellSettings(col: string): {
    setting: CellSetting | null;
    conf: CellConfig | null;
  } {
    const configs = groupedConfigs[col];
    const setting = configs?.find((c) => c.confType.startsWith("setting:"));
    if (!setting) return { setting: null, conf: null };
    return { setting: setting.confType as CellSetting, conf: setting };
  }

  function addError(
    col: (typeof table)["$inferSelect"]["col"],
    error: NewError,
    notes?: string
  ) {
    const errorType = Object.keys(error)[0] as keyof NewError;
    const errorData = error[errorType] as NewErrorMerged;
    newErrors.push({
      refId: id,
      confType: `error:${errorType}` as any,
      col,
      message: errorData.message ?? null,
      value: errorData.value !== undefined && errorData.value !== null ? String(errorData.value) : null,
      options: errorData.options ? JSON.stringify(errorData.options) : null,
      resolved: false,
      notes,
      created: Date.now(),
    });
  }

  function getConfiguredCellValue<T extends typeof cellTransformer>(
    { key, val, options }: ReturnType<T>,
    {
      oldVal,
      dataType,
      notNull,
    }: {
      oldVal: ReturnType<T>["val"];
      dataType: "string" | "number" | "boolean";
      notNull: boolean;
    }
  ): ReturnType<T>["val"] {
    let setting = getCellSettings(key);
    let newVal = val;

    if (setting === null && options?.defaultSettingOfApprove) {
      setting = {
        setting: "setting:approve",
        conf: null,
      };
    }

    if (setting !== null) {
      if (setting.setting === "setting:custom") {
        newVal = setting.conf?.value ?? null;
      } else if (setting.setting === "setting:approve" && oldVal !== val) {
        throw new Error("Not implemented");
        //TODO
      } else if (setting.setting === "setting:approveCustom") {
        throw new Error("Not implemented");
        //TODO
      }
    }

    if (newVal === null && notNull) {
      addError(key as any, {
        canNotBeSetToNull: {
          message: `Value "${newVal}" is null but must not be null; This is not allowed. It should be set to a "${dataType}" value.`,
        },
      });
      newVal = oldVal;
    } else if (newVal !== null && typeof newVal !== dataType) {
      addError(key as any, {
        canNotBeSetToWrongType: {
          value: newVal,
          message: `Value "${newVal}" is of type "${typeof newVal}" but must be of type "${dataType}"; This is not allowed.`,
        },
      });
      newVal = oldVal;
    }

    if (options?.shouldNotBeNull && newVal === null) {
      addError(key as any, {
        shouldNotBeNull: {},
      });
    }

    if (
      options?.shouldMatch &&
      !options.shouldMatch.ignore &&
      newVal !== options.shouldMatch.val &&
      options.shouldMatch.val !== null
    ) {
      addError(key as any, {
        contradictorySources: {
          value: options.shouldMatch.val,
          message: `Value "${newVal}" does not match "${options.shouldMatch.val}", which is found in secondary source "${options.shouldMatch.name}"`,
        },
      });
    }

    return newVal;
  }

  async function commitErrors() {
    const existingErrors = cellConfigs.filter((c) => c.confType.startsWith("error:"));
    const errorsToRemove = new Set<number>(existingErrors.filter(c => c.resolved === false).map((c) => c.id));
    const errorsToAdd = newErrors.filter((newError) => {
      const existingError = findMatchingError(existingErrors, newError);
      if (existingError?.id) {
        errorsToRemove.delete(existingError.id);
        return false;
      }
      return true;
    });

    if (errorsToRemove.size > 0) {
      await db.delete(table).where(inArray(table.id, Array.from(errorsToRemove)));
    }
    if (errorsToAdd.length > 0) {
      await db.insert(table).values(errorsToAdd);
    }
    return errorsToAdd;
  }

  return {
    getConfiguredCellValue,
    addError,
    commitErrors,
  };
}

export const cellTransformer = <
  T extends UnifiedTables,
  K extends keyof T["$inferSelect"]
>(
  key: K,
  val: T["$inferSelect"][K],
  options?: CellTransformerOptions<T["$inferSelect"][K]>
) => {
  return {
    key,
    val,
    options,
  };
};

type CellTransformerOptions<T> = {
  shouldMatch?: { name: string; val: T; ignore?: boolean };
  shouldNotBeNull?: boolean;
  defaultSettingOfApprove?: boolean;
};

function doErrorsMatch(
  error: CellConfigRowSelect | CellConfigRowInsert,
  newError: CellConfigRowInsert | CellConfigRowSelect
): boolean {
  for (const k of Object.keys(error)) {
    const key = k as keyof typeof error;
    if (key === "id" || key === "created" || key === 'refId') continue;
    if ((error[key] !== newError[key])) return false;
  }
  return true;
}

function findMatchingError(errors: (CellConfigRowSelect | CellConfigRowInsert)[], matchError: (CellConfigRowInsert | CellConfigRowSelect)): (CellConfigRowSelect | CellConfigRowInsert) | null {
  for (const error of errors) {
    if (doErrorsMatch(error, matchError)) {
      return error;
    }
  }
  return null;
}

export type CellConfigRowInsert = typeof unifiedGuildCellConfig.$inferInsert;
export type CellConfigRowSelect = typeof unifiedGuildCellConfig.$inferSelect;

type ValType = string | number | boolean | null;

interface NewError {
  multipleOptions?: {
    options: ValType[];
    value: ValType;
  };
  missingValue?: {
    value: ValType;
  };
  needsApproval?: {
    value: ValType;
  };
  matchWouldCauseDuplicate?: {
    value: ValType;
  };
  shouldNotBeNull?: {};
  invalidDataType?: {
    value: ValType;
  };
  contradictorySources?: {
    value: ValType;
    message: string;
  };
  canNotBeSetToNull?: {
    message: string;
  };
  canNotBeSetToWrongType?: {
    value: ValType;
    message: string;
  };
}

type NewErrorMerged = {
  value?: ValType;
  message?: string;
  options?: ValType[];
}


export type CellConfigTables = typeof unifiedGuildCellConfig;