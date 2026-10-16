"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Divider,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { api } from "@/lib/apiClient";
import { unitPrice } from "@/lib/modules";
import OnboardingTour from "@/app/components/OnboardingTour";
import { useChurch } from "@/app/components/ChurchProvider";
import type { Survey } from "@/lib/types";
import { SURVEY_KIND_LABEL } from "@/lib/surveyTemplates";
import PageSkeleton from "@/app/components/PageSkeleton";

const STATUS_COLOR = {
    draft: "default",
    published: "success",
    closed: "warning",
} as const;

export default function DashboardPage() {
    const router = useRouter();
    const { status } = useSession();
    const { church, modules } = useChurch();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const list = await api<{ surveys: Survey[] }>("/api/surveys");
            setSurveys(list.surveys);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load your surveys.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (status === "authenticated") void load();
    }, [status, router, load]);

    if (status === "loading" || (loading && !error)) {
        return (
            <PageSkeleton />
        );
    }

    const responses = surveys.reduce((n, s) => n + (s.responseCount ?? 0), 0);

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <OnboardingTour />
            <Container maxWidth="lg">
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-end" }} gap={2}>
                    <Box>
                        <Typography variant="overline" sx={{ color: "var(--gold)" }}>
                            Dashboard
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: "2.2rem", md: "2.8rem" } }}>
                            {church?.name ?? "Your church"}
                        </Typography>
                        <Typography sx={{ mt: 0.5, color: "var(--ink-2)" }}>
                            Listen to your congregation, then respond with what they need.
                        </Typography>
                    </Box>
                    <Stack direction="row" gap={1.5} flexWrap="wrap">
                        <Button
                            startIcon={<UploadFileIcon />}
                            onClick={() => router.push("/dashboard/surveys/import")}
                            variant="outlined"
                            sx={{ color: "var(--ink)", backgroundColor: "var(--surface)" }}
                        >
                            Import spreadsheet
                        </Button>
                        <Button startIcon={<AddIcon />} onClick={() => router.push("/dashboard/surveys/new")} variant="contained">
                            New survey
                        </Button>
                    </Stack>
                </Stack>

                {church && (
                    <Box sx={{ mt: 4, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
                        <Stat
                            label="Credits"
                            value={church.credits.toLocaleString()}
                            action={{ label: "Add credits", onClick: () => router.push("/dashboard/billing") }}
                            accent
                        />
                        <Stat label="Surveys" value={String(surveys.length)} />
                        <Stat label="Responses collected" value={responses.toLocaleString()} />
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 3 }} action={<Button onClick={() => void load()}>Retry</Button>}>
                        {error}
                    </Alert>
                )}

                <SectionTitle>Surveys</SectionTitle>

                {surveys.length === 0 && !error ? (
                    <Paper
                        variant="outlined"
                        sx={{ p: { xs: 4, md: 7 }, borderRadius: 4, textAlign: "center", borderStyle: "dashed", backgroundColor: "transparent" }}
                    >
                        <Typography variant="h5">Start by listening</Typography>
                        <Typography sx={{ color: "var(--ink-2)", mt: 1, mb: 3 }}>
                            Build a survey from scratch, or import a spreadsheet you already have.
                        </Typography>
                        <Button variant="contained" onClick={() => router.push("/dashboard/surveys/new")}>
                            Create your first survey
                        </Button>
                    </Paper>
                ) : (
                    <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
                        <Stack divider={<Divider />}>
                            {surveys.map((s) => (
                                <Stack
                                    key={s.id}
                                    direction="row"
                                    alignItems="center"
                                    gap={2}
                                    onClick={() => router.push(`/dashboard/surveys/${s.id}`)}
                                    sx={{
                                        px: 3,
                                        py: 2.25,
                                        cursor: "pointer",
                                        transition: "background-color .15s",
                                        "&:hover": { backgroundColor: "var(--page)" },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 2.5,
                                            flexShrink: 0,
                                            display: "grid",
                                            placeItems: "center",
                                            backgroundColor: "var(--brand-soft)",
                                        }}
                                    >
                                        <PollOutlinedIcon sx={{ color: "var(--brand)", fontSize: 20 }} />
                                    </Box>
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 600 }} noWrap>
                                            {s.title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "var(--ink-2)" }}>
                                            {s.kind ? `${SURVEY_KIND_LABEL[s.kind]} · ` : ""}
                                            {s.questions.length} questions · {(s.responseCount ?? 0).toLocaleString()} responses
                                        </Typography>
                                    </Box>
                                    {s.latestAnalysisId && (
                                        <Chip size="small" label="Analyzed" sx={{ backgroundColor: "var(--gold-soft)", color: "#7a5a1f" }} />
                                    )}
                                    <Chip size="small" label={s.status} color={STATUS_COLOR[s.status]} variant="outlined" sx={{ textTransform: "capitalize" }} />
                                    <ChevronRightIcon sx={{ color: "var(--ink-2)", display: { xs: "none", sm: "block" } }} />
                                </Stack>
                            ))}
                        </Stack>
                    </Paper>
                )}

                <SectionTitle>Modules</SectionTitle>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" } }}>
                    {(modules ?? [])
                        .filter((m) => m.id !== "survey_analytics")
                        .map((m) => (
                            <Paper
                                key={m.id}
                                variant="outlined"
                                onClick={() => router.push(m.href)}
                                sx={{
                                    p: 3,
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    transition: "box-shadow .2s, transform .2s",
                                    "&:hover": { boxShadow: "var(--shadow-md)", transform: "translateY(-2px)" },
                                }}
                            >
                                <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                    <Typography variant="h6">{m.name}</Typography>
                                    {m.enabled ? (
                                        <Chip size="small" label="Active" color="success" variant="outlined" />
                                    ) : (
                                        <Chip size="small" icon={<LockOutlinedIcon sx={{ fontSize: "14px !important" }} />} label="Locked" />
                                    )}
                                </Stack>
                                <Typography variant="body2" sx={{ color: "var(--ink-2)" }}>
                                    {m.blurb}
                                </Typography>
                                {m.pricing.credits > 0 && (
                                    <Typography variant="caption" sx={{ display: "block", mt: 2, color: "var(--brand)", fontWeight: 600 }}>
                                        {unitPrice(m.id, church)} credits per {m.pricing.unit}
                                    </Typography>
                                )}
                            </Paper>
                        ))}
                </Box>

                {/* The standalone Bible question categorizer (/dashboard/tools/categorizer) is
                    hidden for now; the route still works if it's linked again. */}
            </Container>
        </Box>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography variant="h4" sx={{ mt: 6, mb: 2, fontSize: "1.9rem" }}>
            {children}
        </Typography>
    );
}

function Stat({
    label,
    value,
    action,
    accent,
}: {
    label: string;
    value: string;
    action?: { label: string; onClick: () => void };
    accent?: boolean;
}) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 3,
                borderRadius: 4,
                ...(accent && {
                    border: "none",
                    color: "#fff",
                    background: "linear-gradient(150deg, #23395d 0%, #13213a 100%)",
                }),
            }}
        >
            <Typography variant="body2" sx={{ color: accent ? "rgba(255,255,255,.7)" : "var(--ink-2)" }}>
                {label}
            </Typography>
            <Stack direction="row" alignItems="flex-end" justifyContent="space-between">
                <Typography variant="h3" sx={{ mt: 0.5, fontSize: "2.6rem" }}>
                    {value}
                </Typography>
                {action && (
                    <Button size="small" onClick={action.onClick} sx={{ color: accent ? "#d9b56c" : "var(--brand)", mb: 0.5 }}>
                        {action.label}
                    </Button>
                )}
            </Stack>
        </Paper>
    );
}
