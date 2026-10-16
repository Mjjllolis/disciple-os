import Image from "next/image";
import { Box, Stack, Typography } from "@mui/material";
import Logo from "./Logo";

/** Full-screen split layout shared by sign in, sign up and password reset. */
export default function AuthShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <Box sx={{ display: "flex", flexDirection: "column", px: { xs: 3, sm: 6 }, py: { xs: 4, md: 5 }, backgroundColor: "var(--page)" }}>
                <Logo />
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 6 }}>
                    <Box sx={{ width: "100%", maxWidth: 400 }}>
                        <Typography variant="h3" sx={{ fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography sx={{ mt: 1, mb: 4, color: "var(--ink-2)" }}>{subtitle}</Typography>
                        )}
                        {children}
                    </Box>
                </Box>
            </Box>

            <Box
                sx={{
                    display: { xs: "none", md: "flex" },
                    flexDirection: "column",
                    justifyContent: "space-between",
                    p: 6,
                    color: "#fff",
                    position: "relative",
                    overflow: "hidden",
                    backgroundColor: "#13213a",
                    // Everything after the photo + tint sits above it.
                    "& > :not(.auth-bg)": { position: "relative" },
                }}
            >
                <Box className="auth-bg" sx={{ position: "absolute", inset: 0 }}>
                    <Image src="/Background2.jpg" alt="" fill priority sizes="50vw" style={{ objectFit: "cover" }} />
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "radial-gradient(900px 500px at 85% 10%, rgba(217,181,108,.22), transparent 60%)," +
                                "linear-gradient(160deg, rgba(35,57,93,.82) 0%, rgba(19,33,58,.92) 100%)",
                        }}
                    />
                </Box>
                <Typography variant="overline" sx={{ color: "rgba(255,255,255,.65)" }}>
                    For local churches
                </Typography>

                <Box sx={{ maxWidth: 480 }}>
                    <Typography
                        className="serif"
                        sx={{ fontSize: "2.6rem", lineHeight: 1.2, fontStyle: "italic", fontWeight: 500 }}
                    >
                        &ldquo;Be diligent to know the state of your flocks, and attend to your herds.&rdquo;
                    </Typography>
                    <Typography sx={{ mt: 2, color: "var(--gold)", fontWeight: 600, letterSpacing: "0.08em", fontSize: "0.85rem" }}>
                        PROVERBS 27:23
                    </Typography>
                </Box>

                <Stack direction="row" gap={4} sx={{ color: "rgba(255,255,255,.8)" }}>
                    {[
                        ["Anonymous", "surveys"],
                        ["AI-grouped", "themes"],
                        ["Sermon", "series"],
                    ].map(([a, b]) => (
                        <Box key={a}>
                            <Typography sx={{ fontWeight: 600, color: "#fff" }}>{a}</Typography>
                            <Typography variant="body2">{b}</Typography>
                        </Box>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}
