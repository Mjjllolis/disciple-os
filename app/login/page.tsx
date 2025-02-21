"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Box, Button, Container, Grid, Paper, TextField, Typography, Link } from "@mui/material";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!/^\S+@\S+$/.test(email)) {
            setErrors((prev) => ({ ...prev, email: "Invalid email address" }));
            return;
        }
        if (password.length < 6) {
            setErrors((prev) => ({ ...prev, password: "Password must be at least 6 characters" }));
            return;
        }

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            setErrors({ email: "Invalid email or password", password: "Invalid email or password" });
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <Container
            maxWidth={false}
            sx={{
                minHeight: "100vh",
                width: "100vw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--light-cream)", // Light beige background
            }}
        >
            <Paper
                elevation={10}
                sx={{
                    display: "flex",
                    width: "90%",
                    maxWidth: 1200,
                    borderRadius: 3,
                    overflow: "hidden",
                    backgroundColor: "#ffffff)", // Light background for the form
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                }}
            >
                {/* Left Section: Login Form */}
                <Box
                    sx={{
                        flex: 1,
                        p: 5,
                        backgroundColor: "#ffffff)",
                        color: "var(--deep-brown)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                    }}
                >
                    <Typography variant="h4" fontWeight={700} align="center" color="var(--deep-brown)" gutterBottom>
                        Welcome to DiscipleOS
                    </Typography>

                    <form onSubmit={handleLogin} noValidate>
                        <TextField
                            label="Email"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={!!errors.email}
                            helperText={errors.email}
                            required
                            sx={{ input: { color: "var(--dark-gray)" } }}
                        />
                        <TextField
                            label="Password"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            error={!!errors.password}
                            helperText={errors.password}
                            required
                            sx={{ input: { color: "var(--dark-gray)" } }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{
                                mt: 3,
                                fontWeight: 600,
                                backgroundColor: "var(--muted-blue)", // Muted blue primary color
                                color: "var(--light-cream)",
                                "&:hover": { backgroundColor: "var(--deep-brown)" }, // Deep brown on hover
                            }}
                        >
                            Sign In
                        </Button>
                    </form>

                    <Typography variant="body2" align="center" sx={{ mt: 2, color: "var(--deep-brown)" }}>
                        Don't have an account?{" "}
                        <Link href="/signup" sx={{ fontWeight: 600, color: "var(--muted-blue)" }}>
                            Sign Up Now
                        </Link>
                    </Typography>
                </Box>

                {/* Right Section: Background Image */}
                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        backgroundImage: "url('/ChurchHands.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
            </Paper>
        </Container>
    );
}
