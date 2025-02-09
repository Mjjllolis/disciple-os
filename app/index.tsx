import { Button, Container, Title } from "@mantine/core";
import { signIn, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";

export default function Home() {
    const { data: session } = useSession();
    const router = useRouter();

    return (
        <Container>
            <Title>Welcome to Disciple OS</Title>
            {session ? (
                <>
                    <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
                    <Button onClick={() => signOut()}>Logout</Button>
                </>
            ) : (
                <Button onClick={() => signIn()}>Login</Button>
            )}
        </Container>
    );
}
