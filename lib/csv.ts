/** Minimal RFC-4180 CSV writer, so exports open cleanly in Excel. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
    return rows
        .map((row) =>
            row
                .map((cell) => {
                    const value = cell == null ? "" : String(cell);
                    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
                })
                .join(",")
        )
        .join("\r\n");
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
    // The BOM is what makes Excel respect UTF-8 in exported answers.
    const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
