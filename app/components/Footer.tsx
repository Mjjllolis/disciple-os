"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Container, Stack, Typography } from "@mui/material";
import Logo from "./Logo";
import { hideChrome } from "./chrome";

export default function Footer() {
    const pathname = usePathname();
    if (hideChrome(pathname)) return null;

    return (
        <Box component="footer" sx={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--surface)", py: 5 }}>
            <Container maxWidth="lg">
                <Stack direction={{ xs: "column", md: "row" }} gap={3} alignItems={{ md: "center" }} justifyContent="space-between">
                    <Logo compact />
                    <Stack direction="row" gap={3} flexWrap="wrap">
                        {[
                            ["How it works", "/#how-it-works"],
                            ["Pricing", "/pricing"],
                            ["Sign in", "/login"],
                            ["Register your church", "/signup"],
                        ].map(([label, href]) => (
                            <Typography
                                key={href}
                                component={Link}
                                href={href}
                                variant="body2"
                                sx={{ color: "var(--ink-2)", "&:hover": { color: "var(--ink)" } }}
                            >
                                {label}
                            </Typography>
                        ))}
                    </Stack>
                </Stack>
                <Typography variant="body2" sx={{ mt: 4, color: "var(--ink-2)" }}>
                    &copy; {new Date().getFullYear()} DiscipleShip International ·{" "}
                    <Box component="span" className="serif" sx={{ fontStyle: "italic", fontSize: "1.05rem" }}>
                        Helping churches listen well.
                    </Box>
                </Typography>
            </Container>
        </Box>
    );
}
