"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Chip, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SurveyBuilder, { blankQuestion } from "@/app/components/SurveyBuilder";
import { api } from "@/lib/apiClient";
import { CHURCH_ANALYSIS_TEMPLATE } from "@/lib/surveyTemplates";
import type { Survey, SurveyQuestion } from "@/lib/types";

type Mode = "choose" | "church_analysis" | "custom";

export default function NewSurveyPage() {
    const [mode, setMode] = useState<Mode>("choose");

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Container maxWidth="md">
                {mode !== "choose" && (
                    <Button onClick={() => setMode("choose")} sx={{ color: "var(--ink-2)", mb: 2, ml: -1 }}>
                        ← Choose a different survey
                    </Button>
                )}
                {mode === "choose" && <Chooser onPick={setMode} />}
                {mode === "church_analysis" && <ChurchAnalysisForm />}
                {mode === "custom" && <CustomForm />}
            </Container>
        </Box>
    );
}

function Chooser({ onPick }: { onPick: (mode: Mode) => void }) {
    const router = useRouter();
    return (
        <>
            <Button onClick={() => router.push("/dashboard")} sx={{ color: "var(--ink-2)", mb: 2, ml: -1 }}>
                ← All surveys
            </Button>
            <Typography variant="overline" sx={{ color: "var(--gold)", display: "block" }}>
                New survey
            </Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
                What would you like to build?
            </Typography>

            <Box sx={{ mt: 4, display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                <KindCard
                    recommended
                    icon={<InsightsOutlinedIcon sx={{ color: "var(--brand)" }} />}
                    title="Church Analysis"
                    blurb="Our proven survey: top 3 stressors and top 3 questions. Ready to share in one click."
                    points={[
                        [true, "AI themes, charts and age breakdowns"],
                        [true, "Feeds the Sermon Builder"],
                        [true, "Link ready immediately"],
                        [false, "Questions are fixed"],
                    ]}
                    onClick={() => onPick("church_analysis")}
                />
                <KindCard
                    icon={<EditNoteOutlinedIcon sx={{ color: "var(--brand)" }} />}
                    title="Custom survey"
                    blurb="Write your own questions for event sign-ups, feedback, or anything else."
                    points={[
                        [true, "Any questions you like"],
                        [true, "Anonymous link and CSV export"],
                        [false, "No AI analysis"],
                    ]}
                    onClick={() => onPick("custom")}
                />
            </Box>
        </>
    );
}

function KindCard({
    icon,
    title,
    blurb,
    points,
    recommended,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    blurb: string;
    points: [boolean, string][];
    recommended?: boolean;
    onClick: () => void;
}) {
    return (
        <Paper
            variant="outlined"
            component="button"
            onClick={onClick}
            sx={{
                p: 3.5,
                borderRadius: 4,
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
                borderWidth: recommended ? 2 : 1,
                borderColor: recommended ? "var(--brand)" : "var(--border)",
                transition: "box-shadow .2s, transform .2s",
                "&:hover": { boxShadow: "var(--shadow-md)", transform: "translateY(-2px)" },
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 3, display: "grid", placeItems: "center", backgroundColor: "var(--brand-soft)" }}>
                    {icon}
                </Box>
                {recommended && <Chip size="small" label="Recommended" sx={{ backgroundColor: "var(--gold-soft)", color: "#7a5a1f" }} />}
            </Stack>
            <Typography variant="h4" sx={{ mt: 2, fontSize: "1.8rem" }}>
                {title}
            </Typography>
            <Typography sx={{ mt: 1, color: "var(--ink-2)" }}>{blurb}</Typography>
            <Stack gap={1} sx={{ mt: 2.5, mb: 3 }}>
                {points.map(([yes, text]) => (
                    <Stack key={text} direction="row" gap={1} alignItems="center">
                        {yes ? (
                            <CheckIcon sx={{ fontSize: 18, color: "var(--brand)" }} />
                        ) : (
                            <CloseIcon sx={{ fontSize: 18, color: "var(--ink-2)" }} />
                        )}
                        <Typography variant="body2" sx={{ color: yes ? "var(--ink)" : "var(--ink-2)" }}>
                            {text}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: "auto", color: "var(--brand)", fontWeight: 600 }}>
                Choose <ArrowForwardIcon sx={{ fontSize: 18 }} />
            </Stack>
        </Paper>
    );
}

function ChurchAnalysisForm() {
    const router = useRouter();
    const [title, setTitle] = useState(CHURCH_ANALYSIS_TEMPLATE.defaultTitle());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const create = async () => {
        setSaving(true);
        setError("");
        try {
            const { survey } = await api<{ survey: Survey }>("/api/surveys", {
                json: { kind: "church_analysis", title },
            });
            router.push(`/dashboard/surveys/${survey.id}?created=1`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create the survey.");
            setSaving(false);
        }
    };

    return (
        <>
            <Typography variant="overline" sx={{ color: "var(--gold)", display: "block" }}>
                Church Analysis
            </Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
                Ready to share
            </Typography>
            <Typography sx={{ mt: 1, color: "var(--ink-2)" }}>
                Name it, then create it. You&apos;ll get a link and QR code for your congregation right away.
            </Typography>

            <Paper variant="outlined" sx={{ mt: 4, p: 3, borderRadius: 4 }}>
                <TextField label="Survey title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
            </Paper>

            <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>
                What people will be asked
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
                <Box sx={{ p: 3, backgroundColor: "var(--surface-muted)" }}>
                    <Typography variant="body2" sx={{ color: "var(--ink-2)", fontStyle: "italic" }}>
                        {CHURCH_ANALYSIS_TEMPLATE.description}
                    </Typography>
                </Box>
                <Stack>
                    {CHURCH_ANALYSIS_TEMPLATE.questions.map((q, i) => (
                        <Stack key={q.prompt} direction="row" gap={2} sx={{ p: 2.5, borderTop: "1px solid var(--border)" }}>
                            <Typography className="serif" sx={{ fontSize: "1.5rem", lineHeight: 1, color: "var(--gold)", fontStyle: "italic", width: 20 }}>
                                {i + 1}
                            </Typography>
                            <Box>
                                <Typography sx={{ fontWeight: 600 }}>
                                    {q.prompt}
                                    {q.required && <Box component="span" sx={{ color: "var(--ink-2)", fontWeight: 400 }}> · required</Box>}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "var(--ink-2)", mt: 0.25 }}>
                                    {q.options?.length ? q.options.join(" / ") : q.helpText}
                                </Typography>
                            </Box>
                        </Stack>
                    ))}
                </Stack>
            </Paper>

            {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

            <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                disabled={saving}
                onClick={() => void create()}
                sx={{ mt: 4 }}
            >
                {saving ? "Creating…" : "Create & get link"}
            </Button>
        </>
    );
}

function CustomForm() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState<SurveyQuestion[]>([blankQuestion()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const save = async () => {
        setSaving(true);
        setError("");
        try {
            const { survey } = await api<{ survey: Survey }>("/api/surveys", {
                json: {
                    kind: "custom",
                    title,
                    description,
                    // Server assigns real ids; the builder's are client-side only.
                    questions: questions.map((q) => ({ ...q, id: undefined })),
                },
            });
            router.push(`/dashboard/surveys/${survey.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save the survey.");
            setSaving(false);
        }
    };

    return (
        <>
            <Typography variant="overline" sx={{ color: "var(--gold)", display: "block" }}>
                Custom survey
            </Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
                Write your questions
            </Typography>
            <Typography sx={{ mt: 1, mb: 4, color: "var(--ink-2)" }}>
                Save it, then publish to get a link. Custom surveys collect and export responses; AI analysis is only for
                Church Analysis surveys.
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, mb: 3 }}>
                <Stack gap={2}>
                    <TextField
                        label="Survey title"
                        fullWidth
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Fall Retreat Interest"
                    />
                    <TextField
                        label="Intro shown to respondents (optional)"
                        fullWidth
                        multiline
                        minRows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="This survey is completely anonymous. Please answer honestly."
                    />
                </Stack>
            </Paper>

            <SurveyBuilder questions={questions} onChange={setQuestions} disabled={saving} analysisControls={false} />

            {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

            <Stack direction="row" gap={2} sx={{ mt: 4 }}>
                <Button variant="contained" disabled={saving || !title.trim()} onClick={() => void save()}>
                    {saving ? "Saving…" : "Save draft"}
                </Button>
                <Button disabled={saving} onClick={() => router.push("/dashboard")} sx={{ color: "var(--ink-2)" }}>
                    Cancel
                </Button>
            </Stack>
        </>
    );
}
