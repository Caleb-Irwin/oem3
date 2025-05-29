import { z } from "zod";
import { history, unifiedGuild, unifiedGuildCellConfig, uniref, type CellSetting } from "../db.schema";
import { router, viewerProcedure } from "../trpc";
import { db } from "../db";
import { desc, eq } from "drizzle-orm";
import { getColConfig, type UnifiedTableNames, type UnifiedTables } from "../utils/unifier";
import type { CellConfigRowSelect, CellConfigTables } from "../utils/cellConfigurator";
import { getResource } from "./resources";
import { eventSubscription } from "../utils/eventSubscription";

const { onUpdate, update } = eventSubscription();

export const updateUnifiedTopicByUniId = update

export const unifiedRouter = router({
    onUpdate,
    get: viewerProcedure.input(
        z.object({
            uniId: z.number(),
        })
    ).query(async ({ input: { uniId } }) => {
        return {
            ...await getUnifiedRow(uniId),
            history: await db.query.history.findMany({
                where: eq(history.uniref, uniId),
                orderBy: desc(history.id),
            })
        }
    })
});

async function getUnifiedRow(uniId: number): Promise<UnifiedRow<UnifiedTables>> {
    const uniRow = await db.query.uniref.findFirst({ where: eq(uniref.uniId, uniId) });
    if (!uniRow) {
        throw new Error("No row found");
    }
    const type = uniRow.resourceType as UnifiedTableNames;
    const table = UnifiedTableMap[type];
    const id = uniRow[type] as number;
    const row = (await db.select().from(table).where(eq(table.id, id)))?.[0];
    if (!row) {
        throw new Error("No row found");
    }
    const cellConfig = await db.select().from(ConfTableMap[type]).where(eq(ConfTableMap[type].refId, id));
    const allActiveErrors = cellConfig.filter((c) => c.confType.startsWith("error:") && !c.resolved);
    const colConfig = getColConfig(table);

    const cells: Record<keyof typeof row, UnifiedCell> = {} as any;

    for (const columnName of Object.keys(row)) {
        const col = columnName as keyof typeof row;
        const settingConf = cellConfig.find((c) => c.col === col && c.confType.startsWith("setting:"));
        cells[col] = {
            compoundId: `${type}:${id}`,
            col,
            value: row[col],
            type: colConfig[col].dataType,
            nullable: colConfig[col].notNull,
            setting: settingConf ? settingConf.confType as CellSetting : null,
            cellSettingConf: settingConf || null,
            activeErrors: allActiveErrors.filter((c) => c.col === col),
            allCellConfigs: cellConfig,
            connectionRow: await getResourceByCol(col, row[col]),
        };
    }

    return {
        uniId: uniId,
        id,
        type,
        row,
        allActiveErrors,
        cells,
    };
}

async function getResourceByCol(col: string, value: string | number | boolean | null) {
    if (!Object.hasOwn(ColToTableName, col) || value === null) return null;
    const tableName = ColToTableName[col as keyof typeof ColToTableName];
    return await getResource({ input: { uniId: -1, type: tableName, id: value as number, includeHistory: false } });
}

const ColToTableName = {
    'dataRow': 'guildData',
    'inventoryRow': 'guildInventory',
    'flyerRow': 'guildFlyer',
};

export interface UnifiedRow<T extends UnifiedTables = UnifiedTables> {
    uniId: number;
    id: number;
    type: UnifiedTableNames;
    row: UnifiedRowTypes;
    allActiveErrors: CellConfigRowSelect[];
    cells: Record<keyof T['$inferSelect'], UnifiedCell>;
}
export type UnifiedGuildRow = UnifiedRow<typeof unifiedGuild>;

export interface UnifiedCell {
    compoundId: string;
    col: string;
    value: string | number | boolean | null;
    type: 'number' | 'string' | 'boolean';
    nullable: boolean;
    setting: CellSetting | null;
    cellSettingConf: CellConfigRowSelect | null;
    activeErrors: CellConfigRowSelect[];
    allCellConfigs: CellConfigRowSelect[];
    connectionRow: Awaited<ReturnType<typeof getResourceByCol>>;
}

export type UnifiedRowTypes = typeof unifiedGuild['$inferSelect'];
const UnifiedTableMap: { [key in UnifiedTableNames]: UnifiedTables } = {
    'unifiedGuild': unifiedGuild,
}
const ConfTableMap: { [key in UnifiedTableNames]: CellConfigTables } = {
    'unifiedGuild': unifiedGuildCellConfig,
}