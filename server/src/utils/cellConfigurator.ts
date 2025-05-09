import { eq } from "drizzle-orm";
import { db as DB } from "../db";
import { unifiedGuildCellConfig, type CellSetting } from "../db.schema";
import type { UnifiedTables } from "./unifier";

type CellConfigTable = typeof unifiedGuildCellConfig;

export async function createCellConfigurator(
  table: CellConfigTable,
  id: number,
  db: typeof DB
) {
  const cellConfigs = await db.select().from(table).where(eq(table.refId, id));
  type CellConfig = (typeof cellConfigs)[number];

  // Group configurations by column
  const groupedConfigs = cellConfigs.reduce((acc, config) => {
    const col = config.col;
    if (!acc[col]) {
      acc[col] = [];
    }
    acc[col].push(config);
    return acc;
  }, {} as Record<string, typeof cellConfigs>);

  function getCellSettings(col: string): {
    setting: CellSetting | null;
    conf: CellConfig | null;
  } {
    const configs = groupedConfigs[col];
    const setting = configs.find((c) => c.cellType.startsWith("setting:"));
    if (!setting) return { setting: null, conf: null };
    return { setting: setting.cellType as CellSetting, conf: setting };
  }

  function getConfiguredCellValue<T extends typeof cellTransformer>(
    { key, val, options }: ReturnType<T>,
    oldVal: ReturnType<T>["val"]
  ): ReturnType<T>["val"] {
    // const { setting, conf } = getCellSettings(key);
    //TODO
    return val;
  }

  return {
    getConfiguredCellValue,
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
  neverNull?: boolean;
  isPrice?: boolean;
  isRef?: boolean;
};
