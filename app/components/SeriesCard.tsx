"use client";

import { useState } from "react";
import Link from "next/link";
import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import { api } from "@/lib/apiClient";
import { useToast } from "./Toast";
import type { Sermon, SermonSeries } from "@/lib/types";

/**
 * A sermon series: header with its title and premise, then the weeks as a
 * numbered timeline. Edit turns the title, premise and every week's title
 * into fields saved together.
 */
export default function SeriesCard({
    series,
    weeks,
    onSaved,
}: {
    series: SermonSeries;
    weeks: Sermon[];
    onSaved: () => void | Promise<void>;
}) {
    const toast = useToast();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState(series.title);
    const [premise, setPremise] = useState(series.premise);
    const [weekTitles, setWeekTitles] = useState<Record<string, string>>({});

    const ordered = weeks.slice().sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0));

    const startEditing = () => {
        setTitle(series.title);
        setPremise(series.premise);
        setWeekTitles(Object.fromEntries(ordered.map((s) => [s.id, s.title])));
        setEditing(true);
    };

    const save = async () => {
        setSaving(true);
        try {
            const changed = Object.fromEntries(
                ordered.filter((s) => weekTitles[s.id]?.trim() && weekTitles[s.id] !== s.title).map((s) => [s.id, weekTitles[s.id].trim()])
            );
            await api(`/api/sermons/series/${series.id}`, {
                method: "PATCH",
                json: { title, premise, weekTitles: changed },
            });
            await onSaved();
            setEditing(false);
            toast.success("Series saved.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save the series.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ mt: 4, borderRadius: 5, overflow: "hidden", border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
            {/* Header */}
            <Box
                sx={{
                    px: { xs: 3, md: 4 },
                    py: { xs: 3, md: 3.5 },
                    // Light while editing, so the field labels stay readable.
                    color: editing ? "var(--ink)" : "#fff",
                    background: editing
                        ? "var(--surface-muted)"
                        : "radial-gradient(600px 240px at 95% 0%, rgba(217,181,108,.28), transparent 60%)," +
                          "linear-gradient(150deg, #23395d 0%, #13213a 100%)",
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                    <Typography variant="overline" sx={{ color: editing ? "var(--gold)" : "#d9b56c" }}>
                        Sermon series · {ordered.length} {ordered.length === 1 ? "week" : "weeks"}
                    </Typography>
                    {!editing && (
                        <Button
                            size="small"
                            startIcon={<EditOutlinedIcon />}
                            onClick={startEditing}
                            sx={{ color: "rgba(255,255,255,.85)", "&:hover": { backgroundColor: "rgba(255,255,255,.08)" } }}
                        >
                            Edit
                        </Button>
                    )}
                </Stack>

                {editing ? (
                    <Stack gap={2} sx={{ mt: 1.5 }}>
                        <TextField label="Series title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
                        <TextField
                            label="What the series is about"
                            value={premise}
                            onChange={(e) => setPremise(e.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                    </Stack>
                ) : (
                    <>
                        <Typography variant="h3" sx={{ mt: 0.5, fontSize: { xs: "2rem", md: "2.5rem" }, lineHeight: 1.1 }}>
                            {series.title}
                        </Typography>
                        {series.premise && (
                            <Typography sx={{ mt: 1.5, color: "rgba(255,255,255,.78)", maxWidth: "75ch", lineHeight: 1.6 }}>
                                {series.premise}
                            </Typography>
                        )}
                    </>
                )}
            </Box>

            {/* Weeks */}
            <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
                {ordered.map((s, i) => {
                    const last = i === ordered.length - 1;
                    const marker = (
                        <Box sx={{ position: "relative", alignSelf: "stretch", width: 40, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                            {/* The line joining the weeks */}
                            {!last && <Box sx={{ position: "absolute", top: 48, bottom: -28, width: 2, backgroundColor: "var(--border)" }} />}
                            <Box
                                sx={{
                                    mt: 1.5,
                                    width: 36,
                                    height: 36,
                                    borderRadius: 99,
                                    display: "grid",
                                    placeItems: "center",
                                    backgroundColor: "var(--gold-soft)",
                                    color: "#7a5a1f",
                                    fontStyle: "italic",
                                    fontSize: "1.25rem",
                                }}
                                className="serif"
                            >
                                {s.weekNumber ?? i + 1}
                            </Box>
                        </Box>
                    );

                    if (editing) {
                        return (
                            <Stack key={s.id} direction="row" gap={2} sx={{ py: 1 }}>
                                {marker}
                                <TextField
                                    label={`Week ${s.weekNumber ?? i + 1}`}
                                    value={weekTitles[s.id] ?? ""}
                                    onChange={(e) => setWeekTitles((w) => ({ ...w, [s.id]: e.target.value }))}
                                    fullWidth
                                    sx={{ mt: 0.75 }}
                                />
                            </Stack>
                        );
                    }

                    return (
                        <Stack
                            key={s.id}
                            component={Link}
                            href={`/dashboard/sermons/${s.id}`}
                            direction="row"
                            gap={2}
                            sx={{
                                py: 1,
                                px: 1,
                                mx: -1,
                                borderRadius: 3,
                                color: "inherit",
                                transition: "background-color .15s",
                                "&:hover": { backgroundColor: "var(--page)" },
                                "&:hover .go": { transform: "translateX(2px)", color: "var(--ink)" },
                            }}
                        >
                            {marker}
                            <Box sx={{ flex: 1, minWidth: 0, py: 1.25 }}>
                                <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
                                    {s.title}
                                </Typography>
                                <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center" sx={{ mt: 0.75 }}>
                                    {s.scripture.slice(0, 3).map((ref) => (
                                        <Chip key={ref} size="small" label={ref} sx={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }} />
                                    ))}
                                    {s.slides && (
                                        <Chip
                                            size="small"
                                            icon={<SlideshowOutlinedIcon sx={{ fontSize: "15px !important" }} />}
                                            label={`${s.slides.slides.length} slides`}
                                            variant="outlined"
                                        />
                                    )}
                                </Stack>
                            </Box>
                            <ChevronRightIcon className="go" sx={{ alignSelf: "center", color: "var(--ink-2)", transition: "transform .15s" }} />
                        </Stack>
                    );
                })}

                {editing && (
                    <Stack direction="row" gap={1.5} sx={{ mt: 2, mb: 1, pl: 7 }}>
                        <Button variant="contained" disabled={saving || !title.trim()} onClick={() => void save()}>
                            {saving ? "Saving…" : "Save series"}
                        </Button>
                        <Button disabled={saving} onClick={() => setEditing(false)} sx={{ color: "var(--ink-2)" }}>
                            Cancel
                        </Button>
                    </Stack>
                )}
            </Box>
        </Box>
    );
}
