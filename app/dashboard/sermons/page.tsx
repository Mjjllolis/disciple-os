"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import { api } from "@/lib/apiClient";
import { priceSermons, priceSlides } from "@/lib/modules";
import { useJob } from "@/app/components/useJob";
import JobProgress from "@/app/components/JobProgress";
import ModuleGate from "@/app/components/ModuleGate";
import ThemePicker from "@/app/components/ThemePicker";
import SeriesCard from "@/app/components/SeriesCard";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useChurch } from "@/app/components/ChurchProvider";
import { useToast } from "@/app/components/Toast";
import type { Analysis, Sermon, SermonSeries, Survey } from "@/lib/types";
import PageSkeleton from "@/app/components/PageSkeleton";

export default function SermonsPage() {
    return (
        <ModuleGate moduleId="sermon_builder">
            <SermonsInner />
        </ModuleGate>
    );
}

function SermonsInner() {
    const router = useRouter();
    const toast = useToast();
    const { reload, church } = useChurch();
    // Per-sermon price for this church; larger churches pay more (see SIZE_TIERS).
    const sermonPrice = priceSermons(1, church);

    const [sermons, setSermons] = useState<Sermon[]>([]);
    const [series, setSeries] = useState<SermonSeries[]>([]);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [dialog, setDialog] = useState<"sermon" | "series" | null>(null);

    const single = useJob<{ sermonId: string }>();
    const seriesJob = useJob<{ seriesId: string }>();

    // Generation form
    const [topic, setTopic] = useState("");
    const [audience, setAudience] = useState("a Sunday morning congregation");
    const [scriptureHint, setScriptureHint] = useState("");
    const [surveyId, setSurveyId] = useState("");
    // Themes chosen for one sermon and for a series; both start empty.
    const [themeIds, setThemeIds] = useState<string[]>([]);
    const [seriesThemeIds, setSeriesThemeIds] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [weeks, setWeeks] = useState(4);
    // Go straight to choosing a slide style once the sermon is written.
    const [slidesNext, setSlidesNext] = useState(false);

    const load = useCallback(async () => {
        try {
            const [data, surveyList] = await Promise.all([
                api<{ sermons: Sermon[]; series: SermonSeries[] }>("/api/sermons"),
                api<{ surveys: Survey[] }>("/api/surveys"),
            ]);
            setSermons(data.sermons);
            setSeries(data.series);
            setSurveys(surveyList.surveys.filter((s) => s.latestAnalysisId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load your sermons.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    // Pull the chosen survey's themes so a sermon can be grounded in verbatims.
    useEffect(() => {
        setThemeIds([]);
        setSeriesThemeIds([]);
        if (!surveyId) {
            setAnalysis(null);
            return;
        }
        api<{ analysis: Analysis | null }>(`/api/surveys/${surveyId}/analyses`)
            .then((d) => setAnalysis(d.analysis))
            .catch(() => setAnalysis(null));
    }, [surveyId]);

    const generateOne = async () => {
        const payload = themeIds.length
            ? { surveyId, analysisId: analysis?.id, themeIds, topic, audience, scriptureHint }
            : { topic, audience, scriptureHint };
        const result = await single.start("/api/sermons/generate", payload);
        if (result?.sermonId) {
            setDialog(null);
            toast.success("Your sermon outline is ready.");
            void reload();
            router.push(`/dashboard/sermons/${result.sermonId}${slidesNext ? "/slides" : ""}`);
        }
    };

    const generateSeries = async () => {
        const result = await seriesJob.start("/api/sermons/series", {
            surveyId,
            analysisId: analysis?.id,
            themeIds: seriesThemeIds,
            weeks,
            audience,
        });
        if (result?.seriesId) {
            setDialog(null);
            toast.success(`Your ${weeks}-week series is ready.`);
            void reload();
            await load();
        }
    };

    if (loading) {
        return (
            <PageSkeleton />
        );
    }

    const surveyQuestions = surveys.find((s) => s.id === surveyId)?.questions ?? [];

    const bySeries = new Map<string, Sermon[]>();
    const standalone: Sermon[] = [];
    for (const s of sermons) {
        if (s.seriesId) bySeries.set(s.seriesId, [...(bySeries.get(s.seriesId) ?? []), s]);
        else standalone.push(s);
    }

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="lg">
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} alignItems={{ sm: "center" }}>
                    <Box>
                        <Typography variant="overline" sx={{ color: "var(--gold)" }}>
                            Sermon Builder
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: "2.2rem", md: "2.8rem" } }}>
                            Your sermons
                        </Typography>
                        <Typography sx={{ mt: 0.5, color: "var(--ink-2)" }}>
                            Preach to what your congregation actually said.
                        </Typography>
                    </Box>
                    <Stack direction="row" gap={1.5} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<CollectionsBookmarkIcon />}
                            onClick={() => setDialog("series")}
                            sx={{ color: "var(--deep-brown)", borderColor: "var(--soft-beige)" }}
                        >
                            Plan a series
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AutoAwesomeIcon />}
                            onClick={() => setDialog("sermon")}
                            sx={{ backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
                        >
                            New sermon
                        </Button>
                    </Stack>
                </Stack>

                {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

                {series.map((sr) => (
                    <SeriesCard key={sr.id} series={sr} weeks={bySeries.get(sr.id) ?? []} onSaved={load} />
                ))}

                {standalone.length > 0 && (
                    <>
                        <Typography variant="h4" sx={{ mt: 6, mb: 2, fontSize: "1.9rem" }}>
                            Standalone sermons
                        </Typography>
                        <Stack gap={1}>
                            {standalone.map((s) => (
                                <SermonRow key={s.id} sermon={s} onOpen={() => router.push(`/dashboard/sermons/${s.id}`)} />
                            ))}
                        </Stack>
                    </>
                )}

                {sermons.length === 0 && !error && (
                    <Paper elevation={0} sx={{ mt: 4, p: 6, borderRadius: 3, textAlign: "center", border: "1px dashed var(--soft-beige)" }}>
                        <Typography sx={{ color: "var(--dark-gray)", mb: 2 }}>
                            Nothing here yet. If you&apos;ve analyzed a survey, a series planned from those themes is
                            the fastest place to start.
                        </Typography>
                        <Button variant="contained" onClick={() => setDialog("series")} sx={{ backgroundColor: "var(--muted-blue)" }}>
                            Plan a series from a survey
                        </Button>
                    </Paper>
                )}

                {/* One sermon */}
                <Dialog open={dialog === "sermon"} onClose={() => !single.running && setDialog(null)} fullWidth maxWidth="sm">
                    <DialogTitle>New sermon</DialogTitle>
                    <DialogContent>
                        <Stack gap={2} sx={{ mt: 1 }}>
                            <TextField select label="Ground it in a survey (optional)" value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
                                <MenuItem value="">Not from a survey</MenuItem>
                                {surveys.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>
                                ))}
                            </TextField>

                            {analysis && (
                                <ThemePicker
                                    analysis={analysis}
                                    questions={surveyQuestions}
                                    value={themeIds}
                                    onChange={setThemeIds}
                                    disabled={single.running}
                                    helperText="Pick one or more. The sermon speaks to all of them, using what people wrote."
                                />
                            )}

                            <TextField
                                label={themeIds.length ? "Focus (optional)" : "Topic"}
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder={themeIds.length ? "e.g. Trusting God when money is tight" : "e.g. Anxiety about money"}
                                helperText={themeIds.length ? "Leave blank to let the selected themes set the topic." : undefined}
                            />
                            <TextField label="Audience" value={audience} onChange={(e) => setAudience(e.target.value)} />
                            <TextField
                                label="Preferred passage (optional)"
                                value={scriptureHint}
                                onChange={(e) => setScriptureHint(e.target.value)}
                                placeholder="e.g. Philippians 4"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={slidesNext} onChange={(e) => setSlidesNext(e.target.checked)} />}
                                label={
                                    <Typography variant="body2">
                                        Make slides next{" "}
                                        <Box component="span" sx={{ color: "var(--ink-2)" }}>
                                            (pick a style after it&apos;s written, {priceSlides(church)} credits)
                                        </Box>
                                    </Typography>
                                }
                            />
                            <JobProgress job={single.job} running={single.running} />
                            {single.error && <Alert severity="error">{single.error}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={single.running} onClick={() => setDialog(null)}>Cancel</Button>
                        <Button
                            variant="contained"
                            disabled={single.running || (!themeIds.length && !topic.trim())}
                            onClick={() => void generateOne()}
                            sx={{ backgroundColor: "var(--muted-blue)" }}
                        >
                            {single.running ? "Writing…" : `Generate — ${sermonPrice} credits`}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Series */}
                <Dialog open={dialog === "series"} onClose={() => !seriesJob.running && setDialog(null)} fullWidth maxWidth="sm">
                    <DialogTitle>Plan a series</DialogTitle>
                    <DialogContent>
                        <Stack gap={2} sx={{ mt: 1 }}>
                            {surveys.length === 0 ? (
                                <Alert severity="info">
                                    Analyze a survey first — a series is built from its themes.
                                </Alert>
                            ) : (
                                <>
                                    <TextField select label="Survey" value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
                                        <MenuItem value="">Choose an analyzed survey…</MenuItem>
                                        {surveys.map((s) => (
                                            <MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        select
                                        label="Weeks"
                                        value={weeks}
                                        onChange={(e) => setWeeks(Number(e.target.value))}
                                    >
                                        {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                                            <MenuItem key={n} value={n}>{n} weeks — {n * sermonPrice} credits</MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField label="Audience" value={audience} onChange={(e) => setAudience(e.target.value)} />
                                    {analysis && (
                                        <ThemePicker
                                            analysis={analysis}
                                            questions={surveyQuestions}
                                            value={seriesThemeIds}
                                            onChange={setSeriesThemeIds}
                                            disabled={seriesJob.running}
                                            placeholder="All themes"
                                            helperText={
                                                seriesThemeIds.length
                                                    ? `Built from ${seriesThemeIds.length} of ${analysis.themes.length} themes.`
                                                    : `None selected: the series draws on all ${analysis.themes.length} themes.`
                                            }
                                        />
                                    )}
                                </>
                            )}
                            <JobProgress job={seriesJob.job} running={seriesJob.running} />
                            {seriesJob.error && <Alert severity="error">{seriesJob.error}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={seriesJob.running} onClick={() => setDialog(null)}>Cancel</Button>
                        <Button
                            variant="contained"
                            disabled={seriesJob.running || !surveyId || !analysis}
                            onClick={() => void generateSeries()}
                            sx={{ backgroundColor: "var(--muted-blue)" }}
                        >
                            {seriesJob.running ? "Planning…" : `Generate — ${weeks * sermonPrice} credits`}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Divider sx={{ my: 5 }} />
                <Typography variant="caption" sx={{ color: "var(--dark-gray)" }}>
                    Generated outlines are a starting point for your own study, not a finished manuscript.
                </Typography>
            </Container>
        </Box>
    );
}

function SermonRow({ sermon, onOpen }: { sermon: Sermon; onOpen: () => void }) {
    return (
        <Paper
            variant="outlined"
            onClick={onOpen}
            sx={{
                p: 2.5,
                borderRadius: 3,
                cursor: "pointer",
                transition: "box-shadow .2s, transform .2s",
                "&:hover": { boxShadow: "var(--shadow-md)", transform: "translateY(-1px)" },
            }}
        >
            <Stack direction="row" gap={2} alignItems="center">
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
                        {sermon.title}
                    </Typography>
                    <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center" sx={{ mt: 0.75 }}>
                        {sermon.scripture.slice(0, 3).map((ref) => (
                            <Chip key={ref} size="small" label={ref} sx={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }} />
                        ))}
                        {sermon.sourceThemeLabel && (
                            <Typography variant="caption" sx={{ color: "var(--ink-2)" }}>
                                from {sermon.sourceThemeLabel}
                            </Typography>
                        )}
                    </Stack>
                </Box>
                <ChevronRightIcon sx={{ color: "var(--ink-2)" }} />
            </Stack>
        </Paper>
    );
}
