"use client";

import { Autocomplete, Box, Checkbox, TextField, Typography } from "@mui/material";
import { groupProfile, GROUP_PROFILES } from "@/lib/surveyTemplates";
import type { Analysis, SurveyQuestion, Theme } from "@/lib/types";

/** Life challenges first, then teaching questions, then anything else. */
const GROUP_ORDER = [GROUP_PROFILES.stressors.title, GROUP_PROFILES.questions.title];

/**
 * A multi-select combobox of an analysis's themes: grouped under their
 * headings (life challenges, questions to teach on) and sorted most to least
 * mentioned within each.
 */
export default function ThemePicker({
    analysis,
    questions = [],
    value,
    onChange,
    label = "Themes",
    placeholder = "Choose themes…",
    helperText,
    disabled = false,
}: {
    analysis: Analysis;
    /** The survey's questions, to recognize groups on analyses that predate group keys. */
    questions?: SurveyQuestion[];
    value: string[];
    onChange: (ids: string[]) => void;
    label?: string;
    placeholder?: string;
    helperText?: string;
    disabled?: boolean;
}) {
    const promptOf = (t: Theme) => questions.find((q) => t.questionIds.includes(q.id))?.prompt;
    const groupOf = (t: Theme) =>
        groupProfile(t.groupKey)?.title ?? t.groupLabel ?? groupProfile(promptOf(t))?.title ?? "Themes";
    const rank = (t: Theme) => {
        const i = GROUP_ORDER.indexOf(groupOf(t));
        return i === -1 ? GROUP_ORDER.length : i;
    };

    // groupBy needs options already ordered by group.
    const options = analysis.themes.slice().sort((a, b) => rank(a) - rank(b) || b.count - a.count);
    const selected = options.filter((t) => value.includes(t.id));

    return (
        <Autocomplete
            multiple
            disableCloseOnSelect
            disabled={disabled}
            options={options}
            value={selected}
            onChange={(_, next) => onChange(next.map((t) => t.id))}
            groupBy={groupOf}
            getOptionLabel={(t) => t.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            limitTags={3}
            ChipProps={{ size: "small" }}
            renderOption={(props, t, { selected: isSelected }) => {
                const { key, ...rest } = props as typeof props & { key: string };
                return (
                    <Box component="li" key={key} {...rest} sx={{ gap: 1 }}>
                        <Checkbox size="small" checked={isSelected} sx={{ p: 0.5 }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                            {t.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--ink-2)" }}>
                            {t.count}
                        </Typography>
                    </Box>
                );
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={selected.length ? "" : placeholder}
                    helperText={helperText}
                />
            )}
        />
    );
}
