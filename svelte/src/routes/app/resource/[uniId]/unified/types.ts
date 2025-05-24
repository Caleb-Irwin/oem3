import type { UnifiedCell } from "../../../../../../../server/src/routers/unified";

export type { UnifiedRow, UnifiedGuildRow } from "../../../../../../../server/src/routers/unified";

export type Cell = UnifiedCell

export interface NamedCell {
    name: string;
    cell: Cell;
}