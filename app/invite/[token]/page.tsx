"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { api } from "@/lib/apiClient";

interface InvitePreview {
    email: string;
    role: string;
    churchName: string;
}

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const router = useRouter();

    const [preview, setPreview] = useState<InvitePreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api<InvitePreview>(`/api/invites?token=${encodeURIComponent(token)}`)
            .then(setPreview)
            .catch((err) => setLoadError(err instanceof Error ? err.message : "That link is not valid."))
            .finally(() => setLoading(false));
    }, [token]);

    const accept = async () => {
        setSubmitting(true);
        setError("");
        try {
            const result = await api<{ email: string; createdAccount: boolean }>("/api/invites/accept", {
                json: { token, name, password },
            });

            if (result.createdAccount) {
                const signedIn = await signIn("credentials", {
                    email: result.email,
                    password,
                    redirect: false,
                });
                if (!signedIn?.error) {
                    router.push("/dashboard");
                    return;
                }
            }
            router.push("/login");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not accept the invitation.");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--light-cream)" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", display: "flex", alignItems: "center", py: 6 }}>
            <Container maxWidth="xs">
                <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid var(--soft-beige)" }}>
                    {loadError ? (
                        <>
                            <Alert severity="warning">{loadError}</Alert>
                            <Button fullWidth sx={{ mt: 2 }} onClick={() => router.push("/login")}>
                                Go to sign in
                            </Button>
                        </>
                    ) : (
                        <>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: "var(--deep-brown)" }}>
                                Join {preview?.churchName}
                            </Typography>
                            <Typography sx={{ mt: 1, mb: 3, color: "var(--dark-gray)" }}>
                                You were invited as {preview?.role === "owner" ? "an owner" : "a leader"} using{" "}
                                <strong>{preview?.email}</strong>.
                            </Typography>

                            <Stack gap={2}>
                                <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                                <TextField
                                    label="Choose a password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    helperText="At least 8 characters. Leave blank if you already have an account."
                                />
                            </Stack>

                            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                            <Button
                                fullWidth
                                variant="contained"
                                disabled={submitting}
                                onClick={() => void accept()}
                                sx={{ mt: 3, backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
                            >
                                {submitting ? "Joining…" : "Accept invitation"}
                            </Button>
                        </>
                    )}
                </Paper>
            </Container>
        </Box>
    );
}
