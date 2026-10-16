"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";
import { api } from "@/lib/apiClient";
import { downloadCsv } from "@/lib/csv";
import ShareSurvey from "@/app/components/ShareSurvey";
import JobProgress from "@/app/components/JobProgress";
import { useJob } from "@/app/components/useJob";
import { useToast } from "@/app/components/Toast";
import { useChurch } from "@/app/components/ChurchProvider";
import type { Analysis, Church, Survey, SurveyResponse } from "@/lib/types";
import { canAnalyze, SURVEY_KIND_LABEL } from "@/lib/surveyTemplates";
import PageSkeleton from "@/app/components/PageSkeleton";

export default function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();
    const { reload: refreshChurch } = useChurch();

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [church, setChurch] = useState<Church | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    const load = useCallback(async () => {
        setError("");
        try {
            const [detail, resp, me] = await Promise.all([
                api<{ survey: Survey; analyses: Analysis[] }>(`/api/surveys/${id}`),
                api<{ responses: SurveyResponse[] }>(`/api/surveys/${id}/responses`),
                api<{ church: Church | null }>("/api/me"),
            ]);
            setSurvey(detail.survey);
            setAnalyses(detail.analyses);
            setResponses(resp.responses);
            setChurch(me.church);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load this survey.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    // Arriving from "Create & get link": say so, then drop the flag from the URL.
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get("created") === "1") {
            setNotice("Your Church Analysis survey is live. Share the link or QR code below to start collecting responses.");
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);

    const setStatus = async (status: Survey["status"]) => {
        setBusy(status);
        setError("");
        try {
            await api(`/api/surveys/${id}`, { method: "PATCH", json: { status } });
            await load();
            setNotice(
                status === "published"
                    ? "Survey published. Share the link below."
                    : status === "closed"
                      ? "Survey closed. It no longer accepts responses."
                      : "Survey reopened as a draft."
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not update the survey.");
        } finally {
            setBusy("");
        }
    };

    const analyzeJob = useJob<{ analysisId: string | null }>();

    const runAnalysis = async () => {
        setError("");
        setNotice("");
        const result = await analyzeJob.start(`/api/surveys/${id}/analyze`);
        if (result?.analysisId) {
            void refreshChurch();
            router.push(`/dashboard/surveys/${id}/analytics?analysisId=${result.analysisId}`);
        }
    };

    /** One row per response, with a column per question. */
    const exportCsv = () => {
        if (!survey) return;
        const header = ["Submitted", ...survey.questions.map((q) => q.prompt)];
        const rows = responses.map((r) => [
            new Date(r.submittedAt).toLocaleString(),
            ...survey.questions.map((q) => {
                const v = r.answers[q.id];
                return Array.isArray(v) ? v.join("; ") : (v ?? "");
            }),
        ]);
        downloadCsv(`${survey.title.replace(/[^\w\s-]/g, "").slice(0, 50) || "survey"}-responses`, [header, ...rows]);
        toast.success(`Exported ${responses.length} responses.`);
    };

    const remove = async () => {
        setConfirmDelete(false);
        setBusy("delete");
        try {
            await api(`/api/surveys/${id}`, { method: "DELETE" });
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete the survey.");
            setBusy("");
        }
    };

    if (loading) {
        return (
            <PageSkeleton />
        );
    }

    if (!survey) {
        return (
            <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 6 }}>
                <Container maxWidth="md">
                    <Alert severity="error">{error || "Survey not found."}</Alert>
                </Container>
            </Box>
        );
    }

    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/s/${survey.publicSlug}` : "";
    const cost = Math.max(1, responses.length);
    const canAfford = (church?.credits ?? 0) >= cost;
    const freeTextQuestions = survey.questions.filter(
        (q) => (q.type === "short_text" || q.type === "long_text") && q.aiCategorize
    );

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="lg">
                <Button onClick={() => router.push("/dashboard")} sx={{ color: "var(--dark-gray)", mb: 2 }}>
                    ← All surveys
                </Button>

                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ md: "center" }}>
                    <Box>
                        <Stack direction="row" gap={1.5} alignItems="center">
                            <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                                {survey.title}
                            </Typography>
                            <Chip size="small" label={survey.status} variant="outlined" sx={{ textTransform: "capitalize" }} />
                            {survey.kind && (
                                <Chip
                                    size="small"
                                    label={SURVEY_KIND_LABEL[survey.kind]}
                                    sx={survey.kind === "church_analysis" ? { backgroundColor: "var(--gold-soft)", color: "#7a5a1f" } : undefined}
                                />
                            )}
                        </Stack>
                        <Typography sx={{ color: "var(--dark-gray)", mt: 0.5 }}>
                            {survey.questions.length} questions · {responses.length} responses
                        </Typography>
                    </Box>

                    <Stack direction="row" gap={1.5} flexWrap="wrap">
                        {survey.status === "draft" && (
                            <Button variant="contained" disabled={Boolean(busy)} onClick={() => void setStatus("published")} sx={primaryBtn}>
                                {busy === "published" ? "Publishing…" : "Publish"}
                            </Button>
                        )}
                        {survey.status === "published" && (
                            <Button variant="outlined" disabled={Boolean(busy)} onClick={() => void setStatus("closed")}>
                                Close survey
                            </Button>
                        )}
                        {survey.status === "closed" && (
                            <Button variant="outlined" disabled={Boolean(busy)} onClick={() => void setStatus("published")}>
                                Reopen
                            </Button>
                        )}
                        {survey.latestAnalysisId && (
                            <Button
                                variant="outlined"
                                startIcon={<InsightsIcon />}
                                onClick={() => router.push(`/dashboard/surveys/${id}/analytics`)}
                            >
                                View results
                            </Button>
                        )}
                    </Stack>
                </Stack>

                {notice && <Alert severity="success" sx={{ mt: 3 }} onClose={() => setNotice("")}>{notice}</Alert>}
                {error && <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError("")}>{error}</Alert>}

                {survey.status !== "draft" && (
                    <Box sx={{ mt: 3 }}>
                        <ShareSurvey url={shareUrl} title={survey.title} />
                    </Box>
                )}

                {/* Analysis: only Church Analysis (and imported) surveys can be analyzed. */}
                {!canAnalyze(survey) ? (
                    <Paper elevation={0} sx={{ mt: 3, p: 3, borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                        <Typography variant="h6" sx={{ color: "var(--deep-brown)" }}>
                            AI analysis
                        </Typography>
                        <Typography variant="body2" sx={{ color: "var(--dark-gray)", mt: 0.5, mb: 2 }}>
                            Custom surveys collect responses and export to CSV, but aren&apos;t analyzed. For AI themes,
                            charts, and sermon ideas, run a Church Analysis survey.
                        </Typography>
                        <Button variant="outlined" onClick={() => router.push("/dashboard/surveys/new")}>
                            Start a Church Analysis
                        </Button>
                    </Paper>
                ) : (
                <Paper elevation={0} sx={{ mt: 3, p: 3, borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                    <Typography variant="h6" sx={{ color: "var(--deep-brown)" }}>
                        AI analysis
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--dark-gray)", mt: 0.5, mb: 2 }}>
                        {freeTextQuestions.length > 0
                            ? `Clusters written answers from ${freeTextQuestions.length} question${freeTextQuestions.length === 1 ? "" : "s"} into themes, then charts them.`
                            : "This survey has no free-text questions marked for AI themes, so analysis will only chart the multiple-choice answers."}
                    </Typography>

                    <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
                        <Button
                            variant="contained"
                            startIcon={<InsightsIcon />}
                            disabled={Boolean(busy) || analyzeJob.running || responses.length === 0 || !canAfford}
                            onClick={() => void runAnalysis()}
                            sx={primaryBtn}
                        >
                            {analyzeJob.running ? "Analyzing…" : `Run analysis — ${cost} credit${cost === 1 ? "" : "s"}`}
                        </Button>
                        <Typography variant="body2" sx={{ color: "var(--dark-gray)" }}>
                            Balance: {(church?.credits ?? 0).toLocaleString()} credits
                        </Typography>
                    </Stack>

                    <JobProgress job={analyzeJob.job} running={analyzeJob.running} />
                    {analyzeJob.error && <Alert severity="error" sx={{ mt: 2 }}>{analyzeJob.error}</Alert>}
                    {responses.length === 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Collect at least one response before running an analysis.
                        </Alert>
                    )}
                    {responses.length > 0 && !canAfford && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            This run needs {cost} credits and you have {church?.credits ?? 0}.{" "}
                            <Button size="small" onClick={() => router.push("/dashboard/billing")}>Get more credits</Button>
                        </Alert>
                    )}

                    {analyses.length > 0 && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="body2" sx={{ color: "var(--dark-gray)", mb: 1 }}>
                                Past runs
                            </Typography>
                            <Stack gap={0.5}>
                                {analyses.map((a) => (
                                    <Stack key={a.id} direction="row" gap={2} alignItems="center">
                                        <Button
                                            size="small"
                                            onClick={() => router.push(`/dashboard/surveys/${id}/analytics?analysisId=${a.id}`)}
                                            sx={{ color: "var(--muted-blue)" }}
                                        >
                                            {new Date(a.createdAt).toLocaleString()}
                                        </Button>
                                        <Typography variant="body2" sx={{ color: "var(--dark-gray)" }}>
                                            {a.responseCount} responses · {a.themes?.length ?? 0} themes · {a.creditsSpent} credits
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </>
                    )}
                </Paper>
                )}

                {/* Raw responses */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 5, mb: 2 }}>
                    <Typography variant="h6" sx={{ color: "var(--deep-brown)" }}>Responses</Typography>
                    {responses.length > 0 && (
                        <Button size="small" onClick={exportCsv} sx={{ color: "var(--deep-brown)" }}>
                            Export CSV
                        </Button>
                    )}
                </Stack>
                {responses.length === 0 ? (
                    <Typography sx={{ color: "var(--dark-gray)" }}>No responses yet.</Typography>
                ) : (
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid var(--soft-beige)", overflowX: "auto", maxHeight: 640 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ backgroundColor: "var(--surface-muted)" }}>Submitted</TableCell>
                                    {survey.questions.map((q) => (
                                        <TableCell key={q.id} sx={{ minWidth: 200, backgroundColor: "var(--surface-muted)" }}>
                                            {q.prompt}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {responses.slice(0, 200).map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell sx={{ whiteSpace: "nowrap", color: "var(--dark-gray)", verticalAlign: "top" }}>
                                            {new Date(r.submittedAt).toLocaleDateString()}
                                        </TableCell>
                                        {survey.questions.map((q) => {
                                            const v = r.answers[q.id];
                                            const text = Array.isArray(v) ? v.join(", ") : String(v ?? "—");
                                            return (
                                                <TableCell key={q.id} sx={{ verticalAlign: "top", maxWidth: 320 }}>
                                                    {/* Long answers clamp to three lines; hover shows the rest. */}
                                                    <Box
                                                        title={text}
                                                        sx={{
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 3,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {text}
                                                    </Box>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {responses.length > 200 && (
                    <Typography variant="body2" sx={{ color: "var(--dark-gray)", mt: 1 }}>
                        Showing the first 200 of {responses.length} responses.
                    </Typography>
                )}

                <Divider sx={{ my: 5 }} />
                <Button color="error" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)}>
                    Delete this survey
                </Button>

                <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                    <DialogTitle>Delete “{survey.title}”?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            This permanently deletes the survey along with its {responses.length} responses and{" "}
                            {analyses.length} analysis {analyses.length === 1 ? "run" : "runs"}. It cannot be undone,
                            and spent credits are not refunded.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                        <Button color="error" onClick={() => void remove()}>
                            Delete permanently
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
}

const primaryBtn = {
    backgroundColor: "var(--muted-blue)",
    "&:hover": { backgroundColor: "var(--brand-hover)" },
} as const;
