"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Alert, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { api } from "@/lib/apiClient";
import AuthShell from "../components/AuthShell";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setSubmitting(true);
        setError("");
        try {
            await api("/api/auth/reset", { json: { email } });
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send the reset email.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthShell title="Reset your password" subtitle="We'll email you a link to set a new one.">
            {sent ? (
                <Alert severity="success">
                    If an account exists for that address, a reset link is on its way. Check your spam folder too.
                </Alert>
            ) : (
                <form onSubmit={submit} noValidate>
                    <Stack gap={2}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        {error && <Alert severity="error">{error}</Alert>}
                        <Button type="submit" fullWidth size="large" variant="contained" disabled={submitting || !email.trim()}>
                            {submitting ? "Sending…" : "Send reset link"}
                        </Button>
                    </Stack>
                </form>
            )}
            <Typography variant="body2" sx={{ mt: 4, textAlign: "center" }}>
                <Link component={NextLink} href="/login" sx={{ fontWeight: 600 }}>
                    ← Back to sign in
                </Link>
            </Typography>
        </AuthShell>
    );
}
