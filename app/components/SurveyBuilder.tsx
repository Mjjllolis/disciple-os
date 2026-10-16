"use client";

import { useState } from "react";
import {
    Box,
    Button,
    Checkbox,
    Chip,
    FormControlLabel,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import type { QuestionType, SurveyQuestion } from "@/lib/types";

const TYPE_LABELS: { value: QuestionType; label: string; hint: string }[] = [
    { value: "short_text", label: "Short answer", hint: "A sentence or two. AI can theme these." },
    { value: "long_text", label: "Paragraph", hint: "Longer writing. AI can theme these." },
    { value: "single_choice", label: "Multiple choice (pick one)", hint: "Counted directly." },
    { value: "multi_choice", label: "Checkboxes (pick many)", hint: "Counted directly." },
    { value: "scale", label: "Rating scale", hint: "Numeric, averaged and counted." },
];

let localSeq = 0;
function blankQuestion(): SurveyQuestion {
    localSeq += 1;
    return {
        id: `new-${Date.now()}-${localSeq}`,
        prompt: "",
        type: "short_text",
        required: false,
        options: [],
        aiCategorize: true,
    };
}

export function isFreeText(type: QuestionType) {
    return type === "short_text" || type === "long_text";
}

export default function SurveyBuilder({
    questions,
    onChange,
    disabled = false,
    analysisControls = true,
}: {
    questions: SurveyQuestion[];
    onChange: (next: SurveyQuestion[]) => void;
    disabled?: boolean;
    /** Off for custom surveys: they're never analyzed, so AI-only options would mislead. */
    analysisControls?: boolean;
}) {
    const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});

    const update = (id: string, patch: Partial<SurveyQuestion>) =>
        onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));

    const move = (index: number, delta: number) => {
        const next = [...questions];
        const target = index + delta;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    const addOption = (q: SurveyQuestion) => {
        const draft = (optionDrafts[q.id] ?? "").trim();
        if (!draft) return;
        if (q.options?.includes(draft)) return;
        update(q.id, { options: [...(q.options ?? []), draft] });
        setOptionDrafts((d) => ({ ...d, [q.id]: "" }));
    };

    return (
        <Stack gap={2}>
            {questions.map((q, index) => {
                const freeText = isFreeText(q.type);
                const choice = q.type === "single_choice" || q.type === "multi_choice";

                return (
                    <Paper key={q.id} elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                        <Stack direction="row" gap={1} alignItems="flex-start">
                            <Typography sx={{ mt: 2, color: "var(--dark-gray)", fontWeight: 700, minWidth: 24 }}>
                                {index + 1}
                            </Typography>

                            <Stack gap={2} sx={{ flexGrow: 1 }}>
                                <TextField
                                    label="Question"
                                    fullWidth
                                    size="small"
                                    disabled={disabled}
                                    value={q.prompt}
                                    onChange={(e) => update(q.id, { prompt: e.target.value })}
                                    placeholder="e.g. What is your biggest source of stress right now?"
                                />

                                <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                                    <TextField
                                        select
                                        label="Answer type"
                                        size="small"
                                        disabled={disabled}
                                        value={q.type}
                                        onChange={(e) => {
                                            const type = e.target.value as QuestionType;
                                            update(q.id, {
                                                type,
                                                options: type === "single_choice" || type === "multi_choice" ? q.options ?? [] : [],
                                                scaleMin: type === "scale" ? (q.scaleMin ?? 1) : undefined,
                                                scaleMax: type === "scale" ? (q.scaleMax ?? 5) : undefined,
                                                aiCategorize: isFreeText(type) ? q.aiCategorize !== false : false,
                                                isSegment: type === "single_choice" || type === "scale" ? q.isSegment : false,
                                            });
                                        }}
                                        sx={{ minWidth: 260 }}
                                        helperText={analysisControls ? TYPE_LABELS.find((t) => t.value === q.type)?.hint : undefined}
                                    >
                                        {TYPE_LABELS.map((t) => (
                                            <MenuItem key={t.value} value={t.value}>
                                                {t.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    {q.type === "scale" && (
                                        <>
                                            <TextField
                                                label="From"
                                                type="number"
                                                size="small"
                                                disabled={disabled}
                                                value={q.scaleMin ?? 1}
                                                onChange={(e) => update(q.id, { scaleMin: Number(e.target.value) })}
                                                sx={{ width: 100 }}
                                            />
                                            <TextField
                                                label="To"
                                                type="number"
                                                size="small"
                                                disabled={disabled}
                                                value={q.scaleMax ?? 5}
                                                onChange={(e) => update(q.id, { scaleMax: Number(e.target.value) })}
                                                sx={{ width: 100 }}
                                            />
                                        </>
                                    )}
                                </Stack>

                                {choice && (
                                    <Box>
                                        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
                                            {(q.options ?? []).map((opt) => (
                                                <Chip
                                                    key={opt}
                                                    label={opt}
                                                    size="small"
                                                    disabled={disabled}
                                                    onDelete={() =>
                                                        update(q.id, { options: (q.options ?? []).filter((o) => o !== opt) })
                                                    }
                                                />
                                            ))}
                                            {!(q.options ?? []).length && (
                                                <Typography variant="body2" sx={{ color: "var(--dark-gray)" }}>
                                                    Add at least two options.
                                                </Typography>
                                            )}
                                        </Stack>
                                        <Stack direction="row" gap={1}>
                                            <TextField
                                                size="small"
                                                placeholder="Add an option"
                                                disabled={disabled}
                                                value={optionDrafts[q.id] ?? ""}
                                                onChange={(e) => setOptionDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        addOption(q);
                                                    }
                                                }}
                                            />
                                            <Button size="small" disabled={disabled} onClick={() => addOption(q)}>
                                                Add
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}

                                <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                size="small"
                                                disabled={disabled}
                                                checked={q.required}
                                                onChange={(e) => update(q.id, { required: e.target.checked })}
                                            />
                                        }
                                        label="Required"
                                    />

                                    {analysisControls && freeText && (
                                        <Tooltip title="Cluster these written answers into themes during analysis.">
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        size="small"
                                                        disabled={disabled}
                                                        checked={q.aiCategorize}
                                                        onChange={(e) => update(q.id, { aiCategorize: e.target.checked })}
                                                    />
                                                }
                                                label={
                                                    <Stack direction="row" gap={0.5} alignItems="center">
                                                        <AutoAwesomeIcon sx={{ fontSize: 16, color: "var(--muted-blue)" }} />
                                                        <span>AI themes</span>
                                                    </Stack>
                                                }
                                            />
                                        </Tooltip>
                                    )}

                                    {analysisControls && (q.type === "single_choice" || q.type === "scale") && (
                                        <Tooltip title="Use this question to break themes down by group, e.g. age range.">
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        size="small"
                                                        disabled={disabled}
                                                        checked={Boolean(q.isSegment)}
                                                        onChange={(e) => update(q.id, { isSegment: e.target.checked })}
                                                    />
                                                }
                                                label="Compare groups by this"
                                            />
                                        </Tooltip>
                                    )}

                                    {analysisControls && freeText && q.aiCategorize && (
                                        <Tooltip title='Give repeated questions the same group name (e.g. "stressors") so they share one set of themes.'>
                                            <TextField
                                                size="small"
                                                label="Theme group"
                                                disabled={disabled}
                                                value={q.themeGroup ?? ""}
                                                onChange={(e) => update(q.id, { themeGroup: e.target.value })}
                                                placeholder="optional"
                                                sx={{ width: 180 }}
                                            />
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Stack>

                            <Stack>
                                <IconButton size="small" disabled={disabled || index === 0} onClick={() => move(index, -1)}>
                                    <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    disabled={disabled || index === questions.length - 1}
                                    onClick={() => move(index, 1)}
                                >
                                    <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    disabled={disabled || questions.length === 1}
                                    onClick={() => onChange(questions.filter((x) => x.id !== q.id))}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Stack>
                    </Paper>
                );
            })}

            <Button
                startIcon={<AddIcon />}
                disabled={disabled}
                onClick={() => onChange([...questions, blankQuestion()])}
                sx={{ alignSelf: "flex-start", color: "var(--deep-brown)" }}
            >
                Add question
            </Button>
        </Stack>
    );
}

export { blankQuestion };
