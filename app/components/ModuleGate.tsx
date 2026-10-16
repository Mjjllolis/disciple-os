"use client";

import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useRouter } from "next/navigation";
import { useChurch } from "./ChurchProvider";
import { unitPrice } from "@/lib/modules";
import type { ModuleId } from "@/lib/types";

/**
 * Wraps a module's pages. Rather than 404-ing a church that hasn't bought the
 * add-on, it explains what the module does and how to turn it on.
 */
export default function ModuleGate({
    moduleId,
    children,
}: {
    moduleId: ModuleId;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { modules, loading, church } = useChurch();

    if (loading || !modules) return null;

    const mod = modules.find((m) => m.id === moduleId);
    if (mod?.enabled) return <>{children}</>;

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 8 }}>
            <Container maxWidth="sm">
                <Paper elevation={0} sx={{ p: 5, borderRadius: 4, border: "1px solid var(--soft-beige)", textAlign: "center" }}>
                    <LockOutlinedIcon sx={{ fontSize: 44, color: "var(--muted-blue)" }} />
                    <Typography variant="h5" sx={{ mt: 2, fontWeight: 700, color: "var(--deep-brown)" }}>
                        {mod?.name ?? "This module"} isn&apos;t enabled yet
                    </Typography>
                    <Typography sx={{ mt: 1.5, color: "var(--dark-gray)" }}>{mod?.blurb}</Typography>
                    {mod && mod.pricing.credits > 0 && (
                        <Typography sx={{ mt: 2, color: "var(--deep-brown)", fontWeight: 600 }}>
                            {unitPrice(mod.id, church)} credits per {mod.pricing.unit}
                        </Typography>
                    )}
                    <Stack direction="row" gap={2} justifyContent="center" sx={{ mt: 4 }}>
                        <Button variant="contained" onClick={() => router.push("/dashboard/billing")} sx={{ backgroundColor: "var(--muted-blue)" }}>
                            How to enable it
                        </Button>
                        <Button onClick={() => router.push("/dashboard")} sx={{ color: "var(--dark-gray)" }}>
                            Back to surveys
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
