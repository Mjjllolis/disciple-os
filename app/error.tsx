"use client";

import { useEffect } from "react";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";

/** Catches render-time failures anywhere in the app. */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[app] unhandled error", error);
    }, [error]);

    return (
        <Box sx={{ minHeight: "70vh", backgroundColor: "var(--light-cream)", display: "flex", alignItems: "center", py: 6 }}>
            <Container maxWidth="sm">
                <Paper elevation={0} sx={{ p: 5, borderRadius: 4, border: "1px solid var(--soft-beige)", textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "var(--deep-brown)" }}>
                        Something went wrong
                    </Typography>
                    <Typography sx={{ mt: 1.5, color: "var(--dark-gray)" }}>
                        The page failed to load. Nothing you were working on was charged for.
                    </Typography>
                    {error.digest && (
                        <Typography variant="caption" sx={{ display: "block", mt: 2, color: "var(--dark-gray)" }}>
                            Reference: {error.digest}
                        </Typography>
                    )}
                    <Stack direction="row" gap={2} justifyContent="center" sx={{ mt: 4 }}>
                        <Button variant="contained" onClick={reset} sx={{ backgroundColor: "var(--muted-blue)" }}>
                            Try again
                        </Button>
                        <Button href="/dashboard" sx={{ color: "var(--dark-gray)" }}>
                            Back to dashboard
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
