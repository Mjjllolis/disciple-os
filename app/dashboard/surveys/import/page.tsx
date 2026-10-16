"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { read, utils } from "xlsx";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Container,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { api } from "@/lib/apiClient";
import type { QuestionType, Survey } from "@/lib/types";

interface ColumnSpec {
    header: string;
    include: boolean;
    type: QuestionType;
    aiCategorize: boolean;
    isSegment: boolean;
    themeGroup: string;
    samples: string[];
    distinct: number;
}

/** Columns that are almost never survey questions. */
const SKIP_HEADER = /^(timestamp|date|time|submitted|email|e-mail|name|id|ip address|username)\b/i;

/**
 * "Top Stressor 1" / "1st Question" both collapse to a stem, so repeated
 * prompts can be detected and put in one theme group.
 */
function stem(header: string): string {
    return header
        .toLowerCase()
        .replace(/\b\d+(st|nd|rd|th)?\b/g, " ")
        .replace(/[^a-z\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function inferColumns(headers: string[], rows: string[][]): ColumnSpec[] {
    const stems = headers.map(stem);
    const stemCounts = new Map<string, number>();
    stems.forEach((s) => stemCounts.set(s, (stemCounts.get(s) ?? 0) + 1));

    return headers.map((header, i) => {
        const values = rows.map((r) => String(r[i] ?? "").trim()).filter(Boolean);
        const distinct = new Set(values).size;
        const longest = values.reduce((n, v) => Math.max(n, v.length), 0);

        // Few distinct, uniformly short values across many rows reads as categorical.
        const categorical =
            distinct >= 2 && distinct <= 12 && longest <= 60 && values.length >= distinct * 2;

        const repeated = (stemCounts.get(stems[i]) ?? 0) > 1;

        return {
            header,
            include: !SKIP_HEADER.test(header) && values.length > 0,
            type: categorical ? "single_choice" : "short_text",
            aiCategorize: !categorical,
            isSegment: categorical,
            themeGroup: !categorical && repeated ? stems[i] : "",
            samples: values.slice(0, 2),
            distinct,
        };
    });
}

export default function ImportPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [fileName, setFileName] = useState("");
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<string[][]>([]);
    const [columns, setColumns] = useState<ColumnSpec[]>([]);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const onFile = async (file: File) => {
        setError("");
        try {
            const buffer = await file.arrayBuffer();
            const wb = read(buffer, { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const grid = utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false });

            if (grid.length < 2) throw new Error("That sheet has no data rows.");

            const head = grid[0].map((h) => String(h ?? "").trim());
            const body = grid
                .slice(1)
                .map((r) => head.map((_, i) => String(r[i] ?? "").trim()))
                .filter((r) => r.some(Boolean));

            setFileName(file.name);
            setHeaders(head);
            setRows(body);
            setColumns(inferColumns(head, body));
            if (!title) setTitle(file.name.replace(/\.(xlsx|xls|csv)$/i, "").trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not read that file.");
        }
    };

    const update = (i: number, patch: Partial<ColumnSpec>) =>
        setColumns((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

    const submit = async () => {
        setBusy(true);
        setError("");
        try {
            const { survey, imported } = await api<{ survey: Survey; imported: number }>(
                "/api/surveys/import",
                {
                    json: {
                        title,
                        description: `Imported from ${fileName}`,
                        columns: columns.map((c) => ({
                            header: c.header,
                            include: c.include,
                            type: c.type,
                            aiCategorize: c.aiCategorize,
                            isSegment: c.isSegment,
                            themeGroup: c.themeGroup || undefined,
                        })),
                        rows,
                    },
                }
            );
            router.push(`/dashboard/surveys/${survey.id}?imported=${imported}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed.");
            setBusy(false);
        }
    };

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="lg">
                <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                    Import a spreadsheet
                </Typography>
                <Typography sx={{ color: "var(--dark-gray)", mb: 4 }}>
                    Already collected responses in Google Forms or Excel? Upload the export and analyze it here.
                </Typography>

                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                    <Stack gap={2}>
                        <Button
                            component="label"
                            variant="outlined"
                            startIcon={<UploadFileIcon />}
                            sx={{ alignSelf: "flex-start", color: "var(--deep-brown)", borderColor: "var(--soft-beige)" }}
                        >
                            {fileName || "Choose .xlsx or .csv"}
                            <input
                                hidden
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void onFile(f);
                                }}
                            />
                        </Button>

                        {headers.length > 0 && (
                            <TextField
                                label="Survey title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                sx={{ maxWidth: 480 }}
                            />
                        )}
                    </Stack>
                </Paper>

                {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

                {headers.length > 0 && (
                    <>
                        <Alert severity="info" sx={{ mt: 3 }}>
                            Found <strong>{rows.length}</strong> rows and <strong>{headers.length}</strong> columns.
                            We guessed how to treat each column — adjust anything that looks wrong.
                        </Alert>

                        <Paper elevation={0} sx={{ mt: 2, borderRadius: 3, border: "1px solid var(--soft-beige)", overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">Use</TableCell>
                                        <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Column</TableCell>
                                        <TableCell sx={{ fontWeight: 700, minWidth: 190 }}>Treat as</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>AI themes</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Compare groups</TableCell>
                                        <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Theme group</TableCell>
                                        <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Sample</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {columns.map((c, i) => {
                                        const freeText = c.type === "short_text" || c.type === "long_text";
                                        return (
                                            <TableRow key={i} hover sx={{ opacity: c.include ? 1 : 0.45 }}>
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={c.include}
                                                        onChange={(e) => update(i, { include: e.target.checked })}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {c.header || <em>(blank)</em>}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: "var(--dark-gray)" }}>
                                                        {c.distinct} distinct values
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        fullWidth
                                                        disabled={!c.include}
                                                        value={c.type}
                                                        onChange={(e) => {
                                                            const type = e.target.value as QuestionType;
                                                            const isText = type === "short_text" || type === "long_text";
                                                            update(i, {
                                                                type,
                                                                aiCategorize: isText,
                                                                isSegment: !isText && type === "single_choice" ? c.isSegment : false,
                                                            });
                                                        }}
                                                    >
                                                        <MenuItem value="short_text">Written answer</MenuItem>
                                                        <MenuItem value="long_text">Long written answer</MenuItem>
                                                        <MenuItem value="single_choice">Category / choice</MenuItem>
                                                        <MenuItem value="scale">Number / rating</MenuItem>
                                                    </TextField>
                                                </TableCell>
                                                <TableCell>
                                                    <Checkbox
                                                        disabled={!c.include || !freeText}
                                                        checked={c.aiCategorize && freeText}
                                                        onChange={(e) => update(i, { aiCategorize: e.target.checked })}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Checkbox
                                                        disabled={!c.include || c.type !== "single_choice"}
                                                        checked={c.isSegment && c.type === "single_choice"}
                                                        onChange={(e) => update(i, { isSegment: e.target.checked })}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        placeholder="—"
                                                        disabled={!c.include || !freeText || !c.aiCategorize}
                                                        value={c.themeGroup}
                                                        onChange={(e) => update(i, { themeGroup: e.target.value })}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Stack gap={0.5}>
                                                        {c.samples.map((s, j) => (
                                                            <Chip
                                                                key={j}
                                                                size="small"
                                                                label={s.length > 42 ? `${s.slice(0, 42)}…` : s}
                                                                variant="outlined"
                                                            />
                                                        ))}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Paper>

                        <Alert severity="info" sx={{ mt: 2 }}>
                            Columns that repeat the same prompt (like “Top Stressor 1/2/3”) share a
                            <strong> theme group</strong> so they’re clustered into one set of themes rather than three.
                        </Alert>

                        <Stack direction="row" gap={2} sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                disabled={busy || !title.trim() || !columns.some((c) => c.include)}
                                onClick={() => void submit()}
                                sx={{ backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
                            >
                                {busy ? "Importing…" : `Import ${rows.length} responses`}
                            </Button>
                            <Button disabled={busy} onClick={() => router.push("/dashboard")} sx={{ color: "var(--dark-gray)" }}>
                                Cancel
                            </Button>
                        </Stack>
                    </>
                )}
            </Container>
        </Box>
    );
}
