"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    MobileStepper,
    Stack,
    Typography,
} from "@mui/material";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import InsightsIcon from "@mui/icons-material/Insights";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { api } from "@/lib/apiClient";
import { useChurch } from "./ChurchProvider";

const STEPS = [
    {
        icon: PollOutlinedIcon,
        title: "Start with a survey",
        body:
            "Build one from scratch, or import a spreadsheet you already have — a Google Forms export works as-is. " +
            "Mark the written questions you want grouped into themes.",
    },
    {
        icon: ShareOutlinedIcon,
        title: "Share one link",
        body:
            "Publishing gives you a link and a QR code. Anyone can answer with no account, and nothing identifying " +
            "is stored, so people answer honestly.",
    },
    {
        icon: InsightsIcon,
        title: "See what they actually said",
        body:
            "Run the analysis and the free-text answers get clustered into themes, charted, and cross-tabbed by " +
            "group — plus a short written summary for your leadership team.",
    },
    {
        icon: AutoAwesomeIcon,
        title: "Turn it into teaching",
        body:
            "With the Sermon Builder module, a survey's themes become a multi-week series grounded in your own " +
            "congregation's words. Image Studio makes the series art to go with it.",
    },
];

/** First-run walkthrough. Shows once per church, then never again. */
export default function OnboardingTour() {
    const router = useRouter();
    const { needsOnboarding, reload, loading } = useChurch();
    const [step, setStep] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    if (loading || !needsOnboarding || dismissed) return null;

    const finish = async (goToBuilder: boolean) => {
        setDismissed(true);
        await api("/api/settings/onboarding", { method: "POST" }).catch(() => {});
        void reload();
        if (goToBuilder) router.push("/dashboard/surveys/new");
    };

    const current = STEPS[step];
    const Icon = current.icon;
    const last = step === STEPS.length - 1;

    return (
        <Dialog open fullWidth maxWidth="xs" onClose={() => void finish(false)}>
            <DialogContent sx={{ pt: 5, pb: 2, textAlign: "center" }}>
                <Box
                    sx={{
                        width: 72,
                        height: 72,
                        mx: "auto",
                        borderRadius: "50%",
                        backgroundColor: "var(--surface-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Icon sx={{ fontSize: 34, color: "var(--deep-brown)" }} />
                </Box>
                <Typography variant="h6" sx={{ mt: 2.5, fontWeight: 700, color: "var(--deep-brown)" }}>
                    {current.title}
                </Typography>
                <Typography sx={{ mt: 1.5, color: "var(--dark-gray)" }}>{current.body}</Typography>

                <MobileStepper
                    variant="dots"
                    steps={STEPS.length}
                    position="static"
                    activeStep={step}
                    sx={{ justifyContent: "center", backgroundColor: "transparent", mt: 3 }}
                    nextButton={null}
                    backButton={null}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={() => void finish(false)} sx={{ color: "var(--dark-gray)" }}>
                    Skip
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Stack direction="row" gap={1}>
                    {step > 0 && <Button onClick={() => setStep((s) => s - 1)}>Back</Button>}
                    <Button
                        variant="contained"
                        onClick={() => (last ? void finish(true) : setStep((s) => s + 1))}
                        sx={{ backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
                    >
                        {last ? "Build my first survey" : "Next"}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
