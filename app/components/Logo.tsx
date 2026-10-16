import Link from "next/link";
import { Box } from "@mui/material";

/** Cross-and-sail mark plus the wordmark. `light` is for dark backgrounds. */
export default function Logo({ href = "/", light = false, compact = false }: { href?: string; light?: boolean; compact?: boolean }) {
    return (
        <Box
            component={Link}
            href={href}
            sx={{ display: "inline-flex", alignItems: "center", gap: 1.25, color: light ? "#fff" : "var(--ink)", flexShrink: 0 }}
        >
            <Box
                component="span"
                sx={{
                    width: 34,
                    height: 34,
                    borderRadius: "10px",
                    display: "grid",
                    placeItems: "center",
                    background: light ? "rgba(255,255,255,.12)" : "var(--brand)",
                    border: light ? "1px solid rgba(255,255,255,.2)" : "none",
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 2v20M6.5 7.5h11" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    <path d="M4 17c2.5 2.6 13.5 2.6 16 0" stroke="#d9b56c" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </Box>
            <Box component="span" sx={{ lineHeight: 1 }}>
                <Box
                    component="span"
                    className="serif"
                    sx={{ display: "block", fontSize: compact ? "1.25rem" : "1.4rem", fontWeight: 600, letterSpacing: "-0.01em" }}
                >
                    DiscipleShip
                </Box>
                {!compact && (
                    <Box
                        component="span"
                        sx={{
                            display: "block",
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                            mt: 0.4,
                            color: light ? "rgba(255,255,255,.7)" : "var(--ink-2)",
                        }}
                    >
                        International
                    </Box>
                )}
            </Box>
        </Box>
    );
}
