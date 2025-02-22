"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Box, Button, Container, Grid, Paper, TextField, Typography, Link } from "@mui/material";

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const handleSignup = async (e: React.FormEvent) => {
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

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            router.push("/login");
        } catch (err: any) {
            if (err.code === "auth/email-already-in-use") {
                setErrors({ email: "This email is already in use. Try logging in." });
            } else if (err.code === "auth/weak-password") {
                setErrors({ password: "Password should be at least 6 characters." });
            } else {
                setErrors({ email: "Failed to create account. Please try again." });
            }
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
                        Create Your Account
                    </Typography>

                    <form onSubmit={handleSignup} noValidate>
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
                            Sign Up
                        </Button>
                    </form>

                    <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                        Already have an account?{" "}
                        <Link href="/login" sx={{ fontWeight: 600, color: "var(--muted-blue)" }}>
                            Log In
                        </Link>
                    </Typography>
                </Box>

                {/* Right Section: Background Image with Overlay Text */}
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
                >
                    {/* Overlay Text */}
                    {/* <Typography
                        variant="h3"
                        fontWeight={700}
                        sx={{
                            position: "absolute",
                            color: "#fff",
                            backgroundColor: "rgba(0,0,0,0.6)",
                            px: 3,
                            py: 1,
                            borderRadius: 2,
                        }}
                    >
                        DiscipleOS
                    </Typography> */}
                </Box>
            </Paper>
        </Container>
    );
}
