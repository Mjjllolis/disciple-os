"use client";

import { use, useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Container,
    FormControl,
    FormControlLabel,
    FormLabel,
    Paper,
    Radio,
    RadioGroup,
    Slider,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { api } from "@/lib/apiClient";
import type { AnswerValue, SurveyQuestion } from "@/lib/types";

interface PublicSurvey {
    id: string;
    title: string;
    description: string;
    questions: SurveyQuestion[];
    status: string;
}

export default function PublicSurveyPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);

    const [survey, setSurvey] = useState<PublicSurvey | null>(null);
    const [churchName, setChurchName] = useState("");
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        api<{ survey: PublicSurvey; churchName: string }>(`/api/public/surveys/${slug}`)
            .then((data) => {
                setSurvey(data.survey);
                setChurchName(data.churchName);
            })
            .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load this survey."))
            .finally(() => setLoading(false));
    }, [slug]);

    const setAnswer = (id: string, value: AnswerValue) => setAnswers((a) => ({ ...a, [id]: value }));

    const submit = async () => {
        setSubmitting(true);
        setError("");
        try {
            await api(`/api/public/surveys/${slug}/submit`, { json: { answers } });
            setSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not submit your response.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Centered>
                <CircularProgress />
            </Centered>
        );
    }

    if (loadError || !survey) {
        return (
            <Centered>
                <Alert severity="warning" sx={{ maxWidth: 480 }}>
                    {loadError || "This survey is not available."}
                </Alert>
            </Centered>
        );
    }

    if (submitted) {
        return (
            <Centered>
                <Paper elevation={0} sx={{ p: 6, borderRadius: 4, textAlign: "center", maxWidth: 520, border: "1px solid var(--soft-beige)" }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "var(--muted-blue)" }} />
                    <Typography variant="h5" sx={{ mt: 2, color: "var(--deep-brown)", fontWeight: 700 }}>
                        Thank you
                    </Typography>
                    <Typography sx={{ mt: 1, color: "var(--dark-gray)" }}>
                        Your answers were submitted anonymously. {churchName || "Your church"} will not see who wrote them.
                    </Typography>
                </Paper>
            </Centered>
        );
    }

    const closed = survey.status !== "published";

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: { xs: 3, md: 6 } }}>
            <Container maxWidth="sm">
                {churchName && (
                    <Typography variant="overline" sx={{ color: "var(--muted-blue)", letterSpacing: ".1rem" }}>
                        {churchName}
                    </Typography>
                )}
                <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                    {survey.title}
                </Typography>
                {survey.description && (
                    <Typography sx={{ mt: 1.5, color: "var(--dark-gray)", whiteSpace: "pre-wrap" }}>
                        {survey.description}
                    </Typography>
                )}
                <Alert severity="info" sx={{ mt: 3, backgroundColor: "var(--surface-muted)", color: "var(--deep-brown)" }}>
                    This survey is anonymous. Your name and email are never collected.
                </Alert>

                {closed && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        This survey is closed and is no longer accepting responses.
                    </Alert>
                )}

                <Stack gap={2.5} sx={{ mt: 4 }}>
                    {survey.questions.map((q, i) => (
                        <Paper key={q.id} elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                            <QuestionField
                                q={q}
                                index={i}
                                disabled={closed || submitting}
                                value={answers[q.id]}
                                onChange={(v) => setAnswer(q.id, v)}
                            />
                        </Paper>
                    ))}
                </Stack>

                {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={closed || submitting}
                    onClick={() => void submit()}
                    sx={{ mt: 4, py: 1.5, backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
                >
                    {submitting ? "Submitting…" : "Submit anonymously"}
                </Button>
            </Container>
        </Box>
    );
}

function QuestionField({
    q,
    index,
    value,
    onChange,
    disabled,
}: {
    q: SurveyQuestion;
    index: number;
    value: AnswerValue | undefined;
    onChange: (v: AnswerValue) => void;
    disabled: boolean;
}) {
    const label = (
        <Typography sx={{ fontWeight: 600, color: "var(--deep-brown)", mb: q.helpText ? 0.5 : 1.5 }}>
            {index + 1}. {q.prompt}
            {q.required && <span style={{ color: "#b3261e" }}> *</span>}
        </Typography>
    );

    return (
        <>
            {label}
            {q.helpText && (
                <Typography variant="body2" sx={{ color: "var(--dark-gray)", mb: 1.5 }}>
                    {q.helpText}
                </Typography>
            )}

            {(q.type === "short_text" || q.type === "long_text") && (
                <TextField
                    fullWidth
                    disabled={disabled}
                    multiline={q.type === "long_text"}
                    minRows={q.type === "long_text" ? 4 : 1}
                    value={(value as string) ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Type your answer"
                />
            )}

            {q.type === "single_choice" && (
                <FormControl disabled={disabled}>
                    <RadioGroup value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
                        {(q.options ?? []).map((opt) => (
                            <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
                        ))}
                    </RadioGroup>
                </FormControl>
            )}

            {q.type === "multi_choice" && (
                <FormControl disabled={disabled}>
                    {(q.options ?? []).map((opt) => {
                        const list = (value as string[]) ?? [];
                        return (
                            <FormControlLabel
                                key={opt}
                                control={
                                    <Checkbox
                                        checked={list.includes(opt)}
                                        onChange={(e) =>
                                            onChange(
                                                e.target.checked ? [...list, opt] : list.filter((o) => o !== opt)
                                            )
                                        }
                                    />
                                }
                                label={opt}
                            />
                        );
                    })}
                </FormControl>
            )}

            {q.type === "scale" && (
                <Box sx={{ px: 1 }}>
                    <FormLabel sx={{ fontSize: 13, color: "var(--dark-gray)" }}>
                        {q.scaleMinLabel || q.scaleMin} — {q.scaleMaxLabel || q.scaleMax}
                    </FormLabel>
                    <Slider
                        disabled={disabled}
                        value={typeof value === "number" ? value : (q.scaleMin ?? 1)}
                        onChange={(_, v) => onChange(v as number)}
                        min={q.scaleMin ?? 1}
                        max={q.scaleMax ?? 5}
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                        sx={{ color: "var(--muted-blue)" }}
                    />
                </Box>
            )}
        </>
    );
}

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                backgroundColor: "var(--light-cream)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
            }}
        >
            {children}
        </Box>
    );
}
