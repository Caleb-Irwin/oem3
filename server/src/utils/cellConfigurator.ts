import { eq } from "drizzle-orm";
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
    const errorData = error[errorType];
    newErrors.push({
      refId: id,
      confType: `error:${errorType}` as any,
      col,
      data: JSON.stringify(errorData),
      notes,
      created: Date.now(),
      lastUpdated: Date.now(),
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
      const data = JSON.parse(setting.conf?.data ?? "{}") as CellConfigData;
      if (setting.setting === "setting:custom") {
        newVal = data?.value ?? null;
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
    // TODO REMOVE RESOLVED ERRORS
    // TODO ADD NEW ERRORS
    // TODO UPDATE ERRORS WITH NEW LAST UPDATED
    // RETURN ERRORS
    if (newErrors.length > 0) {
      await db.insert(table).values(newErrors);
    }
    return newErrors;
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

type CellConfigRowInsert = typeof unifiedGuildCellConfig.$inferInsert;

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

interface CellConfigData {
  resolved?: boolean;

  value?: ValType;
  options?: ValType[];
  name?: string;
  message?: string;
}
