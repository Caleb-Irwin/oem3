import { guildData, guildFlyer, guildInventory, unifiedGuild } from "../db.schema";
import { db as DB } from "../db";

export type UnifiedTables = typeof unifiedGuild;
export type PrimarySourceTables = typeof unifiedGuild | typeof guildData
// export type SecondarySourceTables = typeof unifiedSPR
export type OtherSourceTables = typeof guildInventory | typeof guildFlyer

type CellTransformerOptions<T> = {
    shouldMatch?: { name: string, val: T, ignore?: boolean };
    shouldNotBeNull?: boolean;
    neverNull?: boolean;
    isPrice?: boolean;
    isRef?: boolean;
}

const cellTransformer = <T extends UnifiedTables, K extends keyof T['$inferSelect']>(
    key: K,
    val: T['$inferSelect'][K],
    options?: CellTransformerOptions<T['$inferSelect'][K]>
) => {
    return {
        key,
        val,
        options,
    }
}

export interface TableConnections<RowType, T extends PrimarySourceTables | OtherSourceTables> {
    table: T,
    refCol: keyof RowType;
    recheckConnectionsOnFieldChange: string[];
    findConnections: (row: RowType, db: typeof DB) => Promise<number[]>;
}

interface Connections<RowType> {
    primaryTable: TableConnections<RowType, PrimarySourceTables>;
    // secondaryTable?: TableConnections<RowType, SecondarySourceTables>;
    otherTables: TableConnections<RowType, OtherSourceTables>[];
}

export function createUnifier<RowType, TableType extends UnifiedTables>({
    table,
    getRow,
    transform,
    connections,
}: {
    table: TableType;
    getRow: (id: number, db: typeof DB) => Promise<RowType>;
    transform: (item: RowType, t: typeof cellTransformer) => {
        [K in keyof TableType['$inferSelect']]: ReturnType<typeof cellTransformer> };
    connections: Connections<RowType>;
}) {
    async function updateRow({ id, db = DB }: {
        id: number,
        db?: typeof DB
    }) {
        const item = await getRow(id, db);
        // 1. Check primary connections
        // 2. Check + make other connections
        // 3. Transform
        const transformed = transform(item, cellTransformer);
        // 4. Apply Overrides + Find Errors
        // 5. Update Row
        // 6. Update History
        throw new Error("Not implemented");
    }

    async function updateUnifiedTable({ db = DB, updateAll = false, progress }: {
        db?: typeof DB,
        updateAll?: boolean,
        progress?: (progress: number) => void
    }) {
        if (progress) progress(-1);
        // 1. Add missing primary rows
        // 2. Determine which rows need to be updated
        // 3. Update Rows
        // 4. Batch Update History
    }

    return {
        updateUnifiedTable,
        updateRow,
    }
}