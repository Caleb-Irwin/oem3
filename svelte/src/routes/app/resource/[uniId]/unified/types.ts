import type { UnifiedCell } from "../../../../../../../server/src/routers/unified";

export type { UnifiedRow, UnifiedGuildRow } from "../../../../../../../server/src/routers/unified";

export type Cell = UnifiedCell

export interface NamedCell {
    name: string;
    cell: Cell;
}

import type { ColToTableName as ColToTableNameType } from "../../../../../../../server/src/routers/unified.helpers";

export const ColToTableName: typeof ColToTableNameType = {
    dataRow: "guildData",
    inventoryRow: "guildInventory",
    flyerRow: "guildFlyer",
};