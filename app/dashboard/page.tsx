"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Container, Title, Button, Group, Text } from "@mantine/core";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login"); // Redirect to login if not authenticated
        }
    }, [status, router]);

    return (
        <Container size="lg" my={40}>
            <Text style={{ textAlign: "center" }} component="h1" size="xl">Dashboard</Text>
            {session?.user ? (
                <>
                    <Text style={{ textAlign: "center" }} component="h1" size="xl">Welcome, {session.user.email}!</Text>
                    <Group align="center" mt="md">
                        <Button color="red" onClick={() => signOut()}>Logout</Button>
                    </Group>
                </>
            ) : (
                <Text style={{ textAlign: "center" }} component="h1" size="xl">Loading...</Text>
            )}
        </Container>
    );
}
