"use client";

import { Container, Title, Paper, Stack, Divider, Text, TextInput, PasswordInput, Button, Anchor, Group, Center } from "@mantine/core";
import { useForm } from "@mantine/form";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
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

    const handleLogin = async (values: { email: string; password: string }) => {
        const res = await signIn("credentials", {
            email: values.email,
            password: values.password,
            redirect: false,
        });

        if (res?.error) {
            form.setErrors({ email: 'Invalid email or password', password: 'Invalid email or password' });
        } else {
            router.push("/dashboard");
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
                        Welcome to DiscipleOS
                    </Text>
                    <form onSubmit={form.onSubmit(handleLogin)}>
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
                                Sign In
                            </Button>
                        </Stack>
                    </form>
                    <Center mt={10}>
                        <Text size="sm" style={{
                            textAlign: "center"
                        }}>
                            Don't have an account? <Anchor href="/signup" size="sm" color="red">Sign Up Now</Anchor>
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
                        height: "50VH", // Ensure it takes full viewport height
                        backgroundImage: "url('/ChurchHands.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                >
                    {/* Overlay Text */}
                    <Title
                        style={{
                            position: "absolute", // Ensures it stays on top
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
