"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import { CREDIT_PACKS, formatPrice } from "@/lib/payments";

const MODULES = [
    {
        icon: PollOutlinedIcon,
        name: "Survey Analytics",
        included: true,
        blurb:
            "Build a survey, share one anonymous link, and watch written answers get grouped into themes, " +
            "charted, and broken down by age or any group you choose.",
    },
    {
        icon: AutoAwesomeIcon,
        name: "Sermon Builder",
        blurb:
            "Turn the themes your congregation actually named into a sermon outline, or a whole multi-week " +
            "series, with passages, illustrations, and application. Edit it, then export to Word.",
    },
    {
        icon: ImageOutlinedIcon,
        name: "Image Studio",
        blurb: "Series art, slide backgrounds, and social graphics, sized right for each use.",
    },
    {
        icon: MapOutlinedIcon,
        name: "Tours & Visits",
        blurb:
            "Let guests book a visit through a public link with real capacity limits, and plan multi-stop " +
            "mission trips with dates, hosts, and status for every leg.",
    },
];

const STEPS = [
    {
        title: "Ask",
        body:
            "Build a survey in minutes or import a Google Forms export you already have. Share a link or a QR " +
            "code in the bulletin. Responses are anonymous, so people tell you the truth.",
    },
    {
        title: "Understand",
        body:
            "Hundreds of open-ended answers become a handful of named themes, ranked by how often they came " +
            "up, with the real words behind each one.",
    },
    {
        title: "Respond",
        body:
            "Themes flow straight into a teaching series, the artwork to promote it, and the visit scheduling " +
            "to welcome the people it brings in.",
    },
];

/** Illustrative results drawn from a real congregation survey. */
const SAMPLE_THEMES = [
    { label: "End times & prophecy", pct: 86 },
    { label: "Family salvation", pct: 72 },
    { label: "Finances & provision", pct: 64 },
    { label: "Marriage", pct: 48 },
    { label: "Denominations", pct: 41 },
];

export default function LandingPage() {
    const router = useRouter();

    return (
        <Box>
            {/* Hero */}
            <Box
                id="home"
                sx={{
                    position: "relative",
                    overflow: "hidden",
                    background: "radial-gradient(1000px 520px at 80% -10%, var(--gold-soft), transparent 65%)",
                }}
            >
                <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
                    <Box sx={{ display: "grid", gap: { xs: 6, md: 8 }, gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" }, alignItems: "center" }}>
                        <Box>
                            <Typography variant="overline" sx={{ color: "var(--gold)" }}>
                                Survey insight for local churches
                            </Typography>
                            <Typography
                                variant="h1"
                                sx={{ mt: 1.5, fontSize: { xs: "3rem", md: "4.4rem" }, lineHeight: 1.02 }}
                            >
                                Know what your people are{" "}
                                <Box component="span" sx={{ fontStyle: "italic", color: "var(--brand)" }}>
                                    really carrying
                                </Box>
                            </Typography>
                            <Typography sx={{ mt: 3, color: "var(--ink-2)", fontSize: { xs: "1.05rem", md: "1.2rem" }, maxWidth: 540 }}>
                                Turn anonymous survey answers into clear themes, charts, and a teaching plan, so your
                                ministry answers the questions your congregation is actually asking.
                            </Typography>
                            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 4.5 }}>
                                <Button size="large" variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => router.push("/signup")}>
                                    Register your church
                                </Button>
                                <Button
                                    size="large"
                                    variant="outlined"
                                    sx={{ color: "var(--ink)" }}
                                    onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                                >
                                    See how it works
                                </Button>
                            </Stack>
                            <Typography variant="body2" sx={{ mt: 2.5, color: "var(--ink-2)" }}>
                                Free to build and collect. Pay only when the AI does the work.
                            </Typography>
                        </Box>

                        <HeroVisual />
                    </Box>
                </Container>
            </Box>

            {/* How it works */}
            <Section id="how-it-works" eyebrow="How it works" title="Ask. Understand. Respond.">
                <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
                    {STEPS.map((step, i) => (
                        <Box
                            key={step.title}
                            sx={{ p: 4, borderRadius: 4, backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                        >
                            <Typography className="serif" sx={{ fontSize: "3rem", lineHeight: 1, color: "var(--gold)", fontStyle: "italic" }}>
                                {i + 1}
                            </Typography>
                            <Typography variant="h4" sx={{ mt: 2, fontSize: "1.9rem" }}>
                                {step.title}
                            </Typography>
                            <Typography sx={{ mt: 1.5, color: "var(--ink-2)" }}>{step.body}</Typography>
                        </Box>
                    ))}
                </Box>
            </Section>

            {/* Modules */}
            <Section
                id="modules"
                eyebrow="Modules"
                title="Start with listening. Add the rest when you're ready."
                tinted
            >
                <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                    {MODULES.map((m) => {
                        const Icon = m.icon;
                        return (
                            <Box
                                key={m.name}
                                sx={{
                                    p: 4,
                                    borderRadius: 4,
                                    backgroundColor: "var(--surface)",
                                    border: "1px solid var(--border)",
                                    transition: "box-shadow .2s, transform .2s",
                                    "&:hover": { boxShadow: "var(--shadow-md)", transform: "translateY(-2px)" },
                                }}
                            >
                                <Stack direction="row" alignItems="center" gap={1.5}>
                                    <Box
                                        sx={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 3,
                                            display: "grid",
                                            placeItems: "center",
                                            backgroundColor: "var(--brand-soft)",
                                        }}
                                    >
                                        <Icon sx={{ color: "var(--brand)" }} />
                                    </Box>
                                    <Typography variant="h6">{m.name}</Typography>
                                    {m.included && (
                                        <Chip size="small" label="Included" sx={{ backgroundColor: "var(--gold-soft)", color: "#7a5a1f" }} />
                                    )}
                                </Stack>
                                <Typography sx={{ mt: 2, color: "var(--ink-2)" }}>{m.blurb}</Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Section>

            {/* Quote band */}
            <Box sx={{ position: "relative", py: { xs: 12, md: 18 }, color: "#fff", overflow: "hidden" }}>
                <Image src="/Worship.jpg" alt="" fill sizes="100vw" style={{ objectFit: "cover" }} />
                <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(19,33,58,.78), rgba(19,33,58,.9))" }} />
                <Container maxWidth="md" sx={{ position: "relative", textAlign: "center" }}>
                    <Typography className="serif" sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontStyle: "italic", lineHeight: 1.2 }}>
                        &ldquo;How do we hold faith and disappointment at the same time?&rdquo;
                    </Typography>
                    <Typography sx={{ mt: 3, color: "#d9b56c", fontWeight: 600, letterSpacing: "0.08em", fontSize: "0.85rem" }}>
                        ONE ANONYMOUS ANSWER. NOW A SERMON SERIES.
                    </Typography>
                </Container>
            </Box>

            {/* Pricing */}
            <Section id="pricing" eyebrow="Pricing" title="Pay for what you use">
                <Typography sx={{ mt: -3, mb: 5, color: "var(--ink-2)", textAlign: "center", maxWidth: 600, mx: "auto" }}>
                    Building surveys, collecting responses, and scheduling visits are free and unlimited. Credits are
                    spent only when AI does work for you, and they never expire.
                </Typography>
                <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
                    {CREDIT_PACKS.map((pack) => (
                        <Box
                            key={pack.id}
                            sx={{
                                p: 4,
                                borderRadius: 4,
                                backgroundColor: pack.featured ? "var(--brand)" : "var(--surface)",
                                color: pack.featured ? "#fff" : "var(--ink)",
                                border: pack.featured ? "none" : "1px solid var(--border)",
                                boxShadow: pack.featured ? "var(--shadow-lg)" : "none",
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography sx={{ fontWeight: 600 }}>{pack.name}</Typography>
                                {pack.featured && (
                                    <Chip size="small" label="Most churches" sx={{ backgroundColor: "var(--gold)", color: "#fff" }} />
                                )}
                            </Stack>
                            <Typography variant="h2" sx={{ mt: 2, fontSize: "3.2rem" }}>
                                {formatPrice(pack.priceCents)}
                            </Typography>
                            <Typography sx={{ fontWeight: 600, opacity: 0.85 }}>{pack.credits.toLocaleString()} credits</Typography>
                            <Typography variant="body2" sx={{ mt: 2, opacity: 0.75 }}>
                                {pack.blurb}
                            </Typography>
                        </Box>
                    ))}
                </Box>
                <Box sx={{ textAlign: "center", mt: 5 }}>
                    <Button endIcon={<ArrowForwardIcon />} onClick={() => router.push("/pricing")}>
                        See full pricing
                    </Button>
                </Box>
            </Section>

            {/* Mission */}
            <Box id="mission" sx={{ px: 2, pb: { xs: 8, md: 12 } }}>
                <Container
                    maxWidth="lg"
                    sx={{
                        py: { xs: 8, md: 11 },
                        px: { xs: 3, md: 8 },
                        borderRadius: 6,
                        textAlign: "center",
                        color: "#fff",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <Image src="/Grow.jpg" alt="" fill sizes="(max-width: 1200px) 100vw, 1200px" style={{ objectFit: "cover" }} />
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "radial-gradient(700px 380px at 90% 0%, rgba(217,181,108,.25), transparent 60%)," +
                                "linear-gradient(160deg, rgba(35,57,93,.9) 0%, rgba(19,33,58,.94) 100%)",
                        }}
                    />
                    <Box sx={{ position: "relative" }}>
                    <Typography variant="overline" sx={{ color: "rgba(255,255,255,.65)" }}>
                        Our mission
                    </Typography>
                    <Typography variant="h2" sx={{ mt: 2, fontSize: { xs: "2.2rem", md: "3.2rem" }, maxWidth: 820, mx: "auto" }}>
                        Every congregation carries something its leaders{" "}
                        <Box component="span" sx={{ fontStyle: "italic", color: "#d9b56c" }}>
                            can&apos;t see from the pulpit.
                        </Box>
                    </Typography>
                    <Typography sx={{ mt: 3, color: "rgba(255,255,255,.78)", maxWidth: 580, mx: "auto", fontSize: "1.1rem" }}>
                        We build the tools that help churches listen well, and then do something with what they hear.
                    </Typography>
                    <Button
                        size="large"
                        variant="contained"
                        onClick={() => router.push("/signup")}
                        sx={{ mt: 5, backgroundColor: "#fff", color: "var(--brand)", "&:hover": { backgroundColor: "#f1ece3" } }}
                    >
                        Get started free
                    </Button>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}

function Section({
    id,
    eyebrow,
    title,
    tinted,
    children,
}: {
    id: string;
    eyebrow: string;
    title: string;
    tinted?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Box id={id} sx={{ py: { xs: 8, md: 12 }, backgroundColor: tinted ? "var(--surface-muted)" : "transparent" }}>
            <Container maxWidth="lg">
                <Box sx={{ textAlign: "center", mb: 6 }}>
                    <Typography variant="overline" sx={{ color: "var(--gold)" }}>
                        {eyebrow}
                    </Typography>
                    <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: "2.4rem", md: "3.2rem" }, maxWidth: 760, mx: "auto" }}>
                        {title}
                    </Typography>
                </Box>
                {children}
            </Container>
        </Box>
    );
}

function HeroVisual() {
    return (
        <Box sx={{ position: "relative", pb: { xs: 0, md: 6 }, pl: { xs: 0, md: 6 } }}>
            <Box
                sx={{
                    position: "relative",
                    aspectRatio: { xs: "4 / 3", md: "4 / 5" },
                    borderRadius: 6,
                    overflow: "hidden",
                    boxShadow: "var(--shadow-lg)",
                }}
            >
                <Image
                    src="/About.jpg"
                    alt="Friends laughing together after church"
                    fill
                    priority
                    sizes="(max-width: 900px) 100vw, 45vw"
                    style={{ objectFit: "cover" }}
                />
                <Box
                    sx={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.75,
                        py: 1,
                        borderRadius: 99,
                        backgroundColor: "rgba(255,255,255,.92)",
                        backdropFilter: "blur(6px)",
                    }}
                >
                    <Box sx={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", backgroundColor: "var(--brand)" }}>
                        <CheckIcon sx={{ color: "#fff", fontSize: 14 }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        4-week series drafted
                    </Typography>
                </Box>
            </Box>
            <Box
                sx={{
                    position: { xs: "relative", md: "absolute" },
                    left: { md: 0 },
                    bottom: { md: 0 },
                    width: { xs: "auto", md: "78%" },
                    mt: { xs: -6, md: 0 },
                    mx: { xs: 2, md: 0 },
                }}
            >
                <PreviewCard />
            </Box>
        </Box>
    );
}

function PreviewCard() {
    return (
        <Box
            sx={{
                p: 3,
                borderRadius: 4,
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-lg)",
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="caption" sx={{ color: "var(--ink-2)" }}>
                        Congregation survey · 64 responses
                    </Typography>
                    <Typography variant="h5" sx={{ fontSize: "1.45rem" }}>
                        What people want taught
                    </Typography>
                </Box>
                <Chip size="small" label="Example" variant="outlined" />
            </Stack>

            <Stack gap={1.5} sx={{ mt: 2.5 }}>
                {SAMPLE_THEMES.slice(0, 4).map((t, i) => (
                    <Box key={t.label}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {t.label}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "var(--ink-2)" }}>
                                {t.pct}%
                            </Typography>
                        </Stack>
                        <Box sx={{ height: 7, borderRadius: 99, backgroundColor: "var(--surface-muted)" }}>
                            <Box
                                sx={{
                                    height: "100%",
                                    width: `${t.pct}%`,
                                    borderRadius: 99,
                                    backgroundColor: i === 0 ? "var(--gold)" : "var(--brand)",
                                    opacity: i === 0 ? 1 : 1 - i * 0.16,
                                }}
                            />
                        </Box>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}
