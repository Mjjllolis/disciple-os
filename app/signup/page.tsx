"use client";

import { Container, Title, Paper, Stack, Text, TextInput, PasswordInput, Button, Anchor, Group, Center } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SignupPage() {
    const router = useRouter();
    const form = useForm({
        initialValues: {
            email: '',
            password: '',
        },
        validate: {
            email: (value: string) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value: string) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
        },
    });

    const handleSignup = async (values: { email: string; password: string }) => {
        try {
            await createUserWithEmailAndPassword(auth, values.email, values.password);
            router.push("/login");
        } catch (err: any) {
            if (err.code === "auth/email-already-in-use") {
                form.setErrors({ email: "This email is already in use. Try logging in." });
            } else if (err.code === "auth/weak-password") {
                form.setErrors({ password: "Password should be at least 6 characters." });
            } else {
                form.setErrors({ email: "Failed to create account. Please try again." });
            }
        }
    };

    return (
        <Container
            size={1000}
            my={50}
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
            }}
        >
            <Paper
                withBorder
                shadow="xl"
                p={40}
                radius="lg"
                style={{
                    display: 'flex',
                    width: '100%',
                    maxWidth: 1000,
                    backgroundColor: "#f0f0f0",
                    boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.2)",
                    overflow: 'hidden',
                    borderRadius: "16px",
                }}
            >
                <div style={{ flex: 1, padding: 40, backgroundColor: "#fff", borderRadius: "16px 0 0 16px" }}>
                    <Text style={{ textAlign: "center", fontWeight: 700 }} component="h1" size="xl">
                        Create Your Account
                    </Text>
                    <form onSubmit={form.onSubmit(handleSignup)}>
                        <Stack mt={20} style={{ textAlign: "center" }}>
                            <TextInput
                                label="Email"
                                placeholder="Enter your email"
                                {...form.getInputProps('email')}
                                required
                                size="md"
                            />
                            <PasswordInput
                                label="Password"
                                placeholder="Enter your password"
                                {...form.getInputProps('password')}
                                required
                                size="md"
                            />
                            <Button
                                type="submit"
                                fullWidth
                                size="md"
                                radius="md"
                                color="red"
                                style={{ transition: "0.3s", fontWeight: 600 }}
                            >
                                Sign Up
                            </Button>
                        </Stack>
                    </form>
                    <Center mt={10}>
                        <Text size="sm" style={{
                            textAlign: "center"
                        }}>
                            Already have an account? <Anchor href="/login" size="sm" color="red">Log In</Anchor>
                        </Text>
                    </Center>
                </div>
                {/* Background Image with Overlay Text */}
                <div
                    style={{
                        flex: 1,
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        height: "50VH",
                        backgroundImage: "url('/ChurchHands.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                >
                    {/* Overlay Text */}
                    <Title
                        style={{
                            position: "absolute",
                            color: "#fff",
                            textAlign: "center",
                            backgroundColor: "rgba(0,0,0,0.5)",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            fontWeight: 700,
                        }}
                    >
                        DiscipleOS
                    </Title>
                </div>
            </Paper>
        </Container>
    );
}