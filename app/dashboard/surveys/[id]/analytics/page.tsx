"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { api } from "@/lib/apiClient";
import { groupProfile } from "@/lib/surveyTemplates";
import type { Analysis, SegmentBreakdown, Survey, Theme, ThemeAssignment } from "@/lib/types";
import PageSkeleton from "@/app/components/PageSkeleton";

/**
 * Ranked bars are one hue: length carries the ranking and the axis label the
 * identity, so per-bar colors would only add noise. Segment comparisons use a
 * two-slot categorical pair, validated for colorblind separation (the gold is
 * under 3:1 on white, so the legend and the Table view carry identity too).
 */
const BAR = "#3d6aa8";
const SEGMENT_COLORS = ["#3d6aa8", "#c08a2e"];
const GRID = "#ece6dc";
const AXIS_TICK = { fontSize: 12, fill: "#5b534c" };

type View = "ranked" | "segments" | "table";

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const analysisId = searchParams.get("analysisId");

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const qs = analysisId ? `?analysisId=${encodeURIComponent(analysisId)}` : "";
        api<{ survey: Survey; analysis: Analysis | null }>(`/api/surveys/${id}/analyses${qs}`)
            .then((data) => {
                setSurvey(data.survey);
                setAnalysis(data.analysis);
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Could not load the results."))
            .finally(() => setLoading(false));
    }, [id, analysisId]);

    /** Themes grouped by the question set they came from. */
    const themeGroups = useMemo(() => {
        if (!analysis || !survey) return [];
        const byKey = new Map<string, { label: string; subtitle: string; themes: Theme[] }>();
        for (const theme of analysis.themes) {
            const key = theme.groupKey ?? theme.questionIds.slice().sort().join("|");
            const questions = survey.questions.filter((q) => theme.questionIds.includes(q.id));
            // Older analyses have no group key; recognize the group from its question.
            const profile = groupProfile(theme.groupKey ?? questions[0]?.prompt);
            const label = profile?.title ?? theme.groupLabel ?? questions[0]?.prompt ?? "Written answers";
            const subtitle =
                profile?.subtitle ??
                (questions.length > 1 ? questions.map((q) => q.prompt).join(" · ") : "");
            const g = byKey.get(key) ?? { label, subtitle, themes: [] };
            g.themes.push(theme);
            byKey.set(key, g);
        }
        return [...byKey.values()].map((g) => ({
            ...g,
            themes: g.themes.slice().sort((a, b) => b.count - a.count),
        }));
    }, [analysis, survey]);

    if (loading) {
        return (
            <PageSkeleton />
        );
    }

    if (error || !analysis || !survey) {
        return (
            <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 6 }}>
                <Container maxWidth="md">
                    <Alert severity="info">
                        {error || "No analysis has been run for this survey yet."}
                    </Alert>
                    <Button sx={{ mt: 2 }} onClick={() => router.push(`/dashboard/surveys/${id}`)}>
                        ← Back to survey
                    </Button>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="lg">
                <Button onClick={() => router.push(`/dashboard/surveys/${id}`)} sx={{ color: "var(--dark-gray)", mb: 2 }}>
                    ← {survey.title}
                </Button>

                <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                    Results
                </Typography>
                <Typography sx={{ color: "var(--dark-gray)" }}>
                    {analysis.responseCount} responses · {analysis.themes.length} themes · analyzed{" "}
                    {new Date(analysis.createdAt).toLocaleString()}
                </Typography>

                {/* Leadership summary */}
                {analysis.insights.length > 0 && (
                    <Paper elevation={0} sx={{ mt: 4, p: 3, borderRadius: 3, backgroundColor: "var(--surface-muted)" }}>
                        <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <LightbulbOutlinedIcon sx={{ color: "var(--deep-brown)" }} />
                            <Typography variant="h6" sx={{ color: "var(--deep-brown)" }}>
                                What this is telling you
                            </Typography>
                        </Stack>
                        <Stack component="ul" gap={1.2} sx={{ pl: 3, m: 0 }}>
                            {analysis.insights.map((insight, i) => (
                                <Typography component="li" key={i} sx={{ color: "var(--deep-brown)" }}>
                                    {insight}
                                </Typography>
                            ))}
                        </Stack>
                        <Typography variant="caption" sx={{ display: "block", mt: 2, color: "var(--deep-brown)", opacity: 0.7 }}>
                            AI-generated from the themes below. Read it alongside the verbatim answers, not instead of them.
                        </Typography>
                    </Paper>
                )}

                {/* Theme charts: one section per group (life challenges, questions to teach on) */}
                {themeGroups.map((group, gi) => (
                    <ThemeGroupPanel
                        key={gi}
                        group={group}
                        segments={analysis.segmentBreakdowns}
                        assignments={analysis.assignments}
                    />
                ))}

                {/* Multiple-choice tallies */}
                {analysis.choiceBreakdowns.map((cb) => (
                    <Paper key={cb.questionId} elevation={0} sx={panel}>
                        <Typography variant="h6" sx={{ color: "var(--deep-brown)", mb: 2 }}>
                            {cb.prompt}
                        </Typography>
                        <Box sx={{ height: Math.max(240, cb.counts.length * 44) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cb.counts} layout="vertical" margin={{ left: 8, right: 24 }}>
                                    <CartesianGrid horizontal={false} stroke={GRID} />
                                    <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="label" width={200} tick={AXIS_TICK} interval={0} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: "rgba(31,26,23,.04)" }} content={<ChartTooltip />} />
                                    <Bar dataKey="count" fill={BAR} radius={[0, 4, 4, 0]} barSize={22}>
                                        <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: "#1f1a17" }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                ))}

                <Typography variant="caption" sx={{ display: "block", mt: 4, color: "var(--dark-gray)" }}>
                    Analyzed with {analysis.model} · {analysis.creditsSpent} credits
                </Typography>
            </Container>
        </Box>
    );
}

const panel = {
    mt: 4,
    p: 3,
    borderRadius: 3,
    border: "1px solid var(--soft-beige)",
    backgroundColor: "#fff",
} as const;

interface ThemeGroup {
    label: string;
    subtitle: string;
    themes: Theme[];
}

/** One group of themes, e.g. "Life challenges", with its own view switcher. */
function ThemeGroupPanel({
    group,
    segments,
    assignments,
}: {
    group: ThemeGroup;
    segments: SegmentBreakdown[];
    assignments: ThemeAssignment[];
}) {
    const [view, setView] = useState<View>("ranked");
    const [openTheme, setOpenTheme] = useState<Theme | null>(null);
    const total = group.themes.reduce((n, t) => n + t.count, 0);
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    const data = group.themes.map((t) => ({ name: t.label, count: t.count, share: pct(t.count) }));
    // The first segment question (age group, in the Church Analysis) drives the comparison.
    const segment = segments.find((s) => s.rows.length > 1);

    const views: { id: View; label: string }[] = [
        { id: "ranked", label: "Ranked" },
        ...(segment ? [{ id: "segments" as const, label: `By ${shortPrompt(segment.segmentPrompt)}` }] : []),
        { id: "table", label: "Table" },
    ];

    return (
        <Paper elevation={0} sx={panel}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} alignItems={{ sm: "flex-start" }}>
                <Box>
                    <Typography variant="h4" sx={{ fontSize: "1.9rem" }}>
                        {group.label}
                    </Typography>
                    {group.subtitle && (
                        <Typography variant="body2" sx={{ color: "var(--ink-2)", mt: 0.25 }}>
                            {group.subtitle}
                        </Typography>
                    )}
                    <Typography variant="body2" sx={{ color: "var(--ink-2)", mt: 0.5 }}>
                        {total} answers grouped into {group.themes.length} themes
                    </Typography>
                </Box>
                <PillTabs value={view} options={views} onChange={setView} />
            </Stack>

            <Box sx={{ mt: 3 }}>
                {view === "ranked" && (
                    <Box sx={{ height: Math.max(240, data.length * 40) }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 56 }}>
                                <CartesianGrid horizontal={false} stroke={GRID} />
                                <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" width={210} tick={AXIS_TICK} interval={0} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: "rgba(31,26,23,.04)" }} content={<ChartTooltip suffix={(d) => `${d.share}% of answers`} />} />
                                <Bar dataKey="count" fill={BAR} radius={[0, 4, 4, 0]} barSize={22}>
                                    <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: "#1f1a17" }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                )}

                {view === "segments" && segment && <SegmentChart themes={group.themes} segment={segment} />}

                {view === "table" && (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Theme</TableCell>
                                <TableCell align="right">Mentions</TableCell>
                                <TableCell align="right">Share</TableCell>
                                {segment?.rows.map((r) => (
                                    <TableCell key={r.segment} align="right">
                                        {r.segment}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {group.themes.map((t, i) => (
                                <TableRow key={t.id}>
                                    <TableCell sx={{ color: "var(--ink-2)" }}>{i + 1}</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{t.label}</TableCell>
                                    <TableCell align="right">{t.count}</TableCell>
                                    <TableCell align="right">{pct(t.count)}%</TableCell>
                                    {segment?.rows.map((r) => (
                                        <TableCell key={r.segment} align="right">
                                            {r.themes[t.id] ?? 0}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Box>

            {/* Verbatims: a card per theme; clicking opens every answer behind it. */}
            <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>
                In their words
            </Typography>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" } }}>
                {group.themes.map((t) => (
                    <Paper
                        key={t.id}
                        variant="outlined"
                        component="button"
                        onClick={() => setOpenTheme(t)}
                        sx={{
                            p: 2,
                            borderRadius: 3,
                            textAlign: "left",
                            font: "inherit",
                            color: "inherit",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            transition: "box-shadow .2s, transform .2s",
                            "&:hover": { boxShadow: "var(--shadow-md)", transform: "translateY(-1px)" },
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} sx={{ width: "100%" }}>
                            <Typography sx={{ fontWeight: 600, lineHeight: 1.3 }}>{t.label}</Typography>
                            <Chip size="small" label={t.count} />
                        </Stack>
                        {t.examples[0] && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: "var(--ink-2)",
                                    fontStyle: "italic",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                &ldquo;{t.examples[0]}&rdquo;
                            </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: "var(--brand)", fontWeight: 600, mt: "auto" }}>
                            See all {t.count} answers →
                        </Typography>
                    </Paper>
                ))}
            </Box>

            <ThemeDialog theme={openTheme} assignments={assignments} onClose={() => setOpenTheme(null)} />
        </Paper>
    );
}

/**
 * Share of each segment that named each theme. Percent of the segment, not raw
 * counts: groups differ in size (e.g. far more adults than youth answer).
 */
function SegmentChart({ themes, segment }: { themes: Theme[]; segment: SegmentBreakdown }) {
    const rows = segment.rows.slice(0, SEGMENT_COLORS.length);
    const data = themes.map((t) => {
        const point: Record<string, string | number> = { name: t.label };
        for (const r of rows) point[r.segment] = r.total ? Math.round(((r.themes[t.id] ?? 0) / r.total) * 100) : 0;
        return point;
    });
    return (
        <>
            <Typography variant="body2" sx={{ color: "var(--ink-2)", mb: 1 }}>
                % of each group who named the theme{" "}
                {rows.map((r) => `· ${r.segment}: ${r.total} people`).join(" ")}
            </Typography>
            <Box sx={{ height: Math.max(280, themes.length * 52) }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48 }} barGap={2}>
                        <CartesianGrid horizontal={false} stroke={GRID} />
                        <XAxis type="number" unit="%" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={210} tick={AXIS_TICK} interval={0} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "rgba(31,26,23,.04)" }} content={<ChartTooltip unit="%" />} />
                        <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                        {rows.map((r, i) => (
                            <Bar key={r.segment} dataKey={r.segment} fill={SEGMENT_COLORS[i]} radius={[0, 4, 4, 0]} barSize={14} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </>
    );
}

/** "What is your age group?" → "age group" */
function shortPrompt(prompt: string): string {
    return prompt.replace(/^what is your\s+/i, "").replace(/\?$/, "").toLowerCase();
}

function PillTabs<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: { id: T; label: string }[];
    onChange: (v: T) => void;
}) {
    return (
        <Stack
            direction="row"
            role="tablist"
            sx={{ p: 0.5, gap: 0.5, borderRadius: 99, backgroundColor: "var(--surface-muted)", alignSelf: "flex-start", flexShrink: 0 }}
        >
            {options.map((o) => {
                const active = o.id === value;
                return (
                    <Button
                        key={o.id}
                        role="tab"
                        aria-selected={active}
                        size="small"
                        onClick={() => onChange(o.id)}
                        sx={{
                            px: 2,
                            color: active ? "var(--ink)" : "var(--ink-2)",
                            backgroundColor: active ? "var(--surface)" : "transparent",
                            boxShadow: active ? "var(--shadow-sm)" : "none",
                            "&:hover": { backgroundColor: active ? "var(--surface)" : "rgba(31,26,23,.05)" },
                        }}
                    >
                        {o.label}
                    </Button>
                );
            })}
        </Stack>
    );
}

/** Tooltip in the app's own ink and surface, not the chart's series colors. */
function ChartTooltip({
    active,
    payload,
    label,
    unit = "",
    suffix,
}: {
    active?: boolean;
    payload?: { name?: string; value?: number; color?: string; payload?: Record<string, number | string> }[];
    label?: string;
    unit?: string;
    suffix?: (d: Record<string, number | string>) => string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <Box sx={{ px: 1.5, py: 1, borderRadius: 2, backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {label}
            </Typography>
            {payload.map((p) => (
                <Stack key={p.name} direction="row" gap={1} alignItems="center">
                    {payload.length > 1 && <Box sx={{ width: 8, height: 8, borderRadius: 99, backgroundColor: p.color }} />}
                    <Typography variant="body2" sx={{ color: "var(--ink-2)" }}>
                        {payload.length > 1 ? `${p.name}: ` : ""}
                        {p.value}
                        {unit}
                        {suffix && p.payload ? ` · ${suffix(p.payload)}` : ""}
                    </Typography>
                </Stack>
            ))}
        </Box>
    );
}

/** Every answer the analysis sorted into one theme. */
function ThemeDialog({
    theme,
    assignments,
    onClose,
}: {
    theme: Theme | null;
    assignments: ThemeAssignment[];
    onClose: () => void;
}) {
    const answers = useMemo(() => {
        if (!theme) return [];
        const all = assignments.filter((a) => a.themeId === theme.id).map((a) => a.answerText);
        // Analyses saved without assignments still have the sample quotes.
        return all.length ? all : theme.examples;
    }, [theme, assignments]);

    return (
        <Dialog open={Boolean(theme)} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
            {theme && (
                <>
                    <DialogTitle sx={{ pr: 6 }}>
                        <Typography variant="h4" component="span" sx={{ fontSize: "1.8rem", display: "block" }}>
                            {theme.label}
                        </Typography>
                        <Typography variant="body2" component="span" sx={{ color: "var(--ink-2)", display: "block", mt: 0.5 }}>
                            {theme.description}
                        </Typography>
                        <IconButton aria-label="Close" onClick={onClose} sx={{ position: "absolute", right: 12, top: 12 }}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="overline" sx={{ color: "var(--ink-2)" }}>
                            {answers.length} {answers.length === 1 ? "answer" : "answers"}
                        </Typography>
                        <Stack gap={1.25} sx={{ mt: 1 }}>
                            {answers.map((text, i) => (
                                <Typography
                                    key={i}
                                    variant="body2"
                                    sx={{ borderLeft: "3px solid var(--gold-soft)", pl: 1.5, fontStyle: "italic", color: "var(--ink)" }}
                                >
                                    &ldquo;{text}&rdquo;
                                </Typography>
                            ))}
                        </Stack>
                    </DialogContent>
                </>
            )}
        </Dialog>
    );
}
