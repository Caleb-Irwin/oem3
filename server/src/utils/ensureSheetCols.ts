import { TRPCError } from "@trpc/server";
import * as xlsx from "xlsx";

export function ensureSheetCols(workbook: xlsx.WorkBook, expectedCols: string[]): string[] {
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = xlsx.utils.decode_range(worksheet['!ref']!); // full range of the sheet
    const headers: string[] = [];

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddr = xlsx.utils.encode_cell({ r: range.s.r, c: C }); // r: first row
        const cell = worksheet[cellAddr];
        headers.push(cell ? cell.v : undefined); // push value or undefined
    }

    // Ensure all expected columns are present
    expectedCols.forEach((col) => {
        if (!headers.includes(col)) {
            throw new TRPCError({
                message: "Missing Column: " + col,
                code: "BAD_REQUEST",
            });
        }
    });

    return headers;
}