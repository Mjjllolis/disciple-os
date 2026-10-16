"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert, Box, Button, Divider, Link, Stack, TextField, Typography } from "@mui/material";
import ChurchOutlinedIcon from "@mui/icons-material/ChurchOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import AuthShell from "../components/AuthShell";

/**
 * One-click test logins (created by `npm run seed:fbc-test`). Development only:
 * a production build never renders them, so test credentials never ship.
 */
const TEST_LOGINS =
    process.env.NODE_ENV === "production"
        ? []
        : [
              { label: "Church Login", icon: ChurchOutlinedIcon, email: "fbc-test@example.com", password: "FbcTest2026!" },
              { label: "Admin Login", icon: AdminPanelSettingsOutlinedIcon, email: "admin@example.com", password: "AdminTest2026!" },
          ];

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const login = async (loginEmail: string, loginPassword: string) => {
        setError("");
        setSubmitting(true);
        const res = await signIn("credentials", { email: loginEmail, password: loginPassword, redirect: false });
        if (res?.error) {
            setError("That email and password don't match an account.");
            setSubmitting(false);
        } else {
            router.push("/dashboard");
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^\S+@\S+$/.test(email)) return setError("Enter a valid email address.");
        if (password.length < 6) return setError("Password must be at least 6 characters.");
        await login(email, password);
    };

    return (
        <AuthShell title="Welcome back" subtitle="Sign in to see what your congregation is saying.">
            {TEST_LOGINS.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Stack direction="row" gap={1.5}>
                        {TEST_LOGINS.map((t) => {
                            const Icon = t.icon;
                            return (
                                <Button
                                    key={t.label}
                                    fullWidth
                                    variant="outlined"
                                    size="large"
                                    disabled={submitting}
                                    startIcon={<Icon />}
                                    onClick={() => {
                                        setEmail(t.email);
                                        setPassword(t.password);
                                        void login(t.email, t.password);
                                    }}
                                    sx={{ color: "var(--ink)", backgroundColor: "var(--surface)" }}
                                >
                                    {t.label}
                                </Button>
                            );
                        })}
                    </Stack>
                    <Divider sx={{ mt: 3, color: "var(--ink-2)", fontSize: "0.8rem" }}>or sign in with email</Divider>
                </Box>
            )}
            <form onSubmit={handleLogin} noValidate>
                <Stack gap={2}>
                    <TextField
                        label="Email"
                        type="email"
                        autoComplete="email"
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                    />
                    <Box>
                        <TextField
                            label="Password"
                            type="password"
                            autoComplete="current-password"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Box sx={{ textAlign: "right", mt: 1 }}>
                            <Link component={NextLink} href="/forgot-password" variant="body2">
                                Forgot password?
                            </Link>
                        </Box>
                    </Box>

                    {error && <Alert severity="error">{error}</Alert>}

                    <Button type="submit" fullWidth size="large" variant="contained" disabled={submitting}>
                        {submitting ? "Signing in…" : "Sign in"}
                    </Button>
                </Stack>
            </form>

            <Typography variant="body2" sx={{ mt: 4, color: "var(--ink-2)", textAlign: "center" }}>
                New to DiscipleShip?{" "}
                <Link component={NextLink} href="/signup" sx={{ fontWeight: 600 }}>
                    Register your church
                </Link>
            </Typography>
        </AuthShell>
    );
}
