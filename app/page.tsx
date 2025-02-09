"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Container, Title, Button, Group, Text, Center, Stack, Card, Image } from "@mantine/core";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  return (
    <Container size="lg" my={40} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <Center>
        <Stack align="center" gap="xl" style={{ width: "100%", maxWidth: "900px", textAlign: "center" }}>
          <Image src="/hero-image.png" alt="Disciple OS" width={300} height={300} style={{ borderRadius: "50%" }} />
          <Title order={1} style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50" }}>Empower Your Church with Disciple OS</Title>
          <Text size="lg" style={{ maxWidth: "700px", opacity: 0.8, fontSize: "1.2rem", lineHeight: "1.6", color: "#34495E" }}>
            The most powerful platform to help churches grow, engage, and manage their communities efficiently.
          </Text>

          {session?.user ? (
            <Card shadow="lg" p="xl" radius="md" withBorder style={{ width: "100%", backgroundColor: "#F7F9FC", borderRadius: "12px", maxWidth: "600px" }}>
              <Title order={3} style={{ color: "#2C3E50" }}>Hello, {session.user?.email}!</Title>
              <Text style={{ fontSize: "1.1rem", color: "#555" }}>We're glad to have you onboard.</Text>
              <Group justify="center" mt="md">
                <Button color="red" size="lg" radius="xl" onClick={() => signOut()}>Logout</Button>
              </Group>
            </Card>
          ) : (
            <Group>
              <Button size="lg" color="blue" radius="xl" onClick={() => router.push("/signup")}>Get Started</Button>
              <Button size="lg" variant="outline" color="blue" radius="xl" onClick={() => router.push("/login")}>Login</Button>
            </Group>
          )}
        </Stack>
      </Center>
    </Container>
  );
}
