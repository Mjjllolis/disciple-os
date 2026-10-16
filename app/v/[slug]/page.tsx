"use client";

import { use, useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { api } from "@/lib/apiClient";

interface SlotPayload {
    slot: {
        id: string;
        title: string;
        description: string;
        startsAt: string;
        durationMinutes: number;
        seatsLeft: number;
        status: string;
    };
    church: { name: string; logoUrl: string | null; brandColor: string | null };
}

export default function BookVisitPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);

    const [data, setData] = useState<SlotPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", phone: "", partySize: 1, notes: "" });

    useEffect(() => {
        api<SlotPayload>(`/api/public/visits/${slug}`)
            .then(setData)
            .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load this page."))
            .finally(() => setLoading(false));
    }, [slug]);

    const submit = async () => {
        setSubmitting(true);
        setError("");
        try {
            await api(`/api/public/visits/${slug}/book`, { json: form });
            setDone(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not complete your booking.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Centered><CircularProgress /></Centered>;

    if (loadError || !data) {
        return (
            <Centered>
                <Alert severity="warning" sx={{ maxWidth: 460 }}>{loadError || "This page is not available."}</Alert>
            </Centered>
        );
    }

    const { slot, church } = data;
    const accent = church.brandColor || "var(--muted-blue)";
    const when = new Date(slot.startsAt);

    if (done) {
        return (
            <Centered>
                <Paper elevation={0} sx={{ p: 6, borderRadius: 4, textAlign: "center", maxWidth: 520, border: "1px solid var(--soft-beige)" }}>
                    <EventAvailableIcon sx={{ fontSize: 56, color: accent }} />
                    <Typography variant="h5" sx={{ mt: 2, fontWeight: 700, color: "var(--deep-brown)" }}>
                        You&apos;re booked
                    </Typography>
                    <Typography sx={{ mt: 1.5, color: "var(--dark-gray)" }}>
                        {when.toLocaleString()} with {church.name}. We sent a confirmation to {form.email}.
                    </Typography>
                </Paper>
            </Centered>
        );
    }

    const closed = slot.status !== "open" || slot.seatsLeft <= 0;

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: { xs: 3, md: 6 } }}>
            <Container maxWidth="sm">
                {church.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={church.logoUrl} alt={church.name} style={{ maxHeight: 56, marginBottom: 16 }} />
                )}
                <Typography variant="overline" sx={{ color: accent, letterSpacing: ".1rem" }}>
                    {church.name}
                </Typography>
                <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                    {slot.title}
                </Typography>
                <Typography sx={{ mt: 1, color: "var(--dark-gray)" }}>
                    {when.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                    {" · "}
                    {when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    {" · "}
                    {slot.durationMinutes} minutes
                </Typography>
                {slot.description && (
                    <Typography sx={{ mt: 2, color: "var(--dark-gray)", whiteSpace: "pre-wrap" }}>{slot.description}</Typography>
                )}

                {closed ? (
                    <Alert severity="warning" sx={{ mt: 3 }}>
                        {slot.status !== "open"
                            ? "Bookings for this time are closed."
                            : "This visit is now full. Please check back for another time."}
                    </Alert>
                ) : (
                    <Alert severity="info" sx={{ mt: 3, backgroundColor: "var(--surface-muted)", color: "var(--deep-brown)" }}>
                        {slot.seatsLeft} {slot.seatsLeft === 1 ? "spot" : "spots"} left.
                    </Alert>
                )}

                <Paper elevation={0} sx={{ mt: 3, p: 3, borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                    <Stack gap={2}>
                        <TextField label="Your name" disabled={closed} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        <TextField label="Email" type="email" disabled={closed} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        <TextField label="Phone (optional)" disabled={closed} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        <TextField
                            label="How many people?"
                            type="number"
                            disabled={closed}
                            value={form.partySize}
                            onChange={(e) => setForm({ ...form, partySize: Math.max(1, Number(e.target.value)) })}
                            inputProps={{ min: 1, max: Math.max(1, slot.seatsLeft) }}
                        />
                        <TextField
                            label="Anything we should know? (optional)"
                            multiline
                            minRows={2}
                            disabled={closed}
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        />
                    </Stack>
                </Paper>

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={closed || submitting || !form.name.trim() || !form.email.trim()}
                    onClick={() => void submit()}
                    sx={{ mt: 3, py: 1.5, backgroundColor: accent, "&:hover": { backgroundColor: "var(--brand-hover)" } }}
                >
                    {submitting ? "Booking…" : "Book my visit"}
                </Button>
            </Container>
        </Box>
    );
}

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
            {children}
        </Box>
    );
}
