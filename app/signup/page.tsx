"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert, Button, Divider, Link, Stack, TextField, Typography } from "@mui/material";
import { api } from "@/lib/apiClient";
import AuthShell from "../components/AuthShell";

export default function SignupPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        churchName: "",
        name: "",
        email: "",
        password: "",
        city: "",
        state: "",
    });
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!form.churchName.trim()) return setError("Please enter your church's name.");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return setError("Enter a valid email address.");
        if (form.password.length < 8) return setError("Password must be at least 8 characters.");

        setSubmitting(true);
        try {
            // Creates the Firebase user, the church, and the owner profile.
            await api("/api/signup", { json: form });

            const result = await signIn("credentials", {
                email: form.email,
                password: form.password,
                redirect: false,
            });
            if (result?.error) {
                router.push("/login");
                return;
            }
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create your account.");
            setSubmitting(false);
        }
    };

    return (
        <AuthShell
            title="Register your church"
            subtitle="Free to build surveys and collect responses. Welcome credits included."
        >
            <form onSubmit={handleSignup} noValidate>
                <Stack gap={2}>
                    <TextField
                        label="Church name"
                        fullWidth
                        value={form.churchName}
                        onChange={set("churchName")}
                        placeholder="First Baptist Church"
                        autoFocus
                    />
                    <Stack direction="row" gap={2}>
                        <TextField label="City" fullWidth value={form.city} onChange={set("city")} />
                        <TextField label="State" sx={{ width: 120 }} value={form.state} onChange={set("state")} />
                    </Stack>

                    <Divider sx={{ my: 0.5 }} />

                    <TextField label="Your name" fullWidth autoComplete="name" value={form.name} onChange={set("name")} />
                    <TextField
                        label="Email"
                        type="email"
                        autoComplete="email"
                        fullWidth
                        value={form.email}
                        onChange={set("email")}
                    />
                    <TextField
                        label="Password"
                        type="password"
                        autoComplete="new-password"
                        fullWidth
                        value={form.password}
                        onChange={set("password")}
                        helperText="At least 8 characters"
                    />

                    {error && <Alert severity="error">{error}</Alert>}

                    <Button type="submit" fullWidth size="large" variant="contained" disabled={submitting}>
                        {submitting ? "Creating your account…" : "Create account"}
                    </Button>
                </Stack>
            </form>

            <Typography variant="body2" sx={{ mt: 4, color: "var(--ink-2)", textAlign: "center" }}>
                Already have an account?{" "}
                <Link component={NextLink} href="/login" sx={{ fontWeight: 600 }}>
                    Sign in
                </Link>
            </Typography>
        </AuthShell>
    );
}
