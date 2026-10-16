"use client";

import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Divider,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { MODULE_LIST, priceImages, priceSermons, priceSlides } from "@/lib/modules";
import { SIZE_TIERS } from "@/lib/churchProfile";
import { CREDIT_PACKS, formatPrice } from "@/lib/payments";

/**
 * Public pricing. Both halves read from source of truth — per-action costs from
 * the module registry, pack prices from the payments registry — so this page
 * can never show a number different from what is actually charged.
 */

export default function PricingPage() {
    const router = useRouter();

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: { xs: 6, md: 10 } }}>
            <Container maxWidth="lg">
                <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: "var(--deep-brown)", fontSize: { xs: "2rem", md: "2.8rem" } }}>
                        Simple, usage-based pricing
                    </Typography>
                    <Typography sx={{ mt: 2, color: "var(--dark-gray)", fontSize: "1.15rem", maxWidth: 680, mx: "auto" }}>
                        Building surveys, collecting responses, and scheduling visits cost nothing.
                        You spend credits only when the AI does work for you.
                    </Typography>
                </Box>

                {/* What things cost — driven by the module registry */}
                <Typography variant="h5" sx={{ mt: 8, mb: 3, fontWeight: 700, color: "var(--deep-brown)", textAlign: "center" }}>
                    What things cost
                </Typography>
                <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid var(--soft-beige)", backgroundColor: "#fff" }}>
                    <Stack divider={<Divider />}>
                        {MODULE_LIST.map((m) => (
                            <Stack key={m.id} direction={{ xs: "column", sm: "row" }} gap={1} sx={{ p: 3 }} alignItems={{ sm: "center" }}>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Stack direction="row" gap={1} alignItems="center">
                                        <Typography sx={{ fontWeight: 700, color: "var(--deep-brown)" }}>{m.name}</Typography>
                                        {m.includedByDefault && (
                                            <Chip size="small" label="Included with every account" sx={{ backgroundColor: "var(--surface-muted)" }} />
                                        )}
                                    </Stack>
                                    <Typography variant="body2" sx={{ color: "var(--dark-gray)", mt: 0.5 }}>
                                        {m.blurb}
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontWeight: 700, color: "var(--muted-blue)", whiteSpace: "nowrap" }}>
                                    {m.pricing.credits === 0
                                        ? "No credit cost"
                                        : `${m.pricing.credits} credits / ${m.pricing.unit}`}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Paper>

                {/* Size-based pricing for flat-priced items */}
                <Typography variant="h5" sx={{ mt: 8, mb: 1, fontWeight: 700, color: "var(--deep-brown)", textAlign: "center" }}>
                    Priced to your church&apos;s size
                </Typography>
                <Typography sx={{ color: "var(--dark-gray)", textAlign: "center", mb: 3, maxWidth: 620, mx: "auto" }}>
                    Sermons, slides, and images cost more credits for larger churches. Survey analysis is always one credit per
                    response, so it already grows with your congregation.
                </Typography>
                <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid var(--soft-beige)", backgroundColor: "#fff", overflowX: "auto" }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Weekly attendance</TableCell>
                                <TableCell align="right">Sermon</TableCell>
                                <TableCell align="right">Image</TableCell>
                                <TableCell align="right">Slide deck</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {SIZE_TIERS.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell sx={{ fontWeight: 600 }}>{t.label}</TableCell>
                                    <TableCell align="right">{priceSermons(1, { sizeTier: t.id })} credits</TableCell>
                                    <TableCell align="right">{priceImages(1, { sizeTier: t.id })} credits</TableCell>
                                    <TableCell align="right">{priceSlides({ sizeTier: t.id })} credits</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>

                {/* Credit packs */}
                <Typography variant="h5" sx={{ mt: 8, mb: 1, fontWeight: 700, color: "var(--deep-brown)", textAlign: "center" }}>
                    Credit packs
                </Typography>
                <Typography sx={{ color: "var(--dark-gray)", textAlign: "center", mb: 3 }}>
                    Credits never expire.
                </Typography>

                <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
                    {CREDIT_PACKS.map((pack) => (
                        <Paper
                            key={pack.id}
                            elevation={0}
                            sx={{
                                p: 4,
                                borderRadius: 4,
                                textAlign: "center",
                                backgroundColor: pack.featured ? "var(--soft-beige)" : "#fff",
                                border: pack.featured ? "2px solid var(--muted-blue)" : "1px solid var(--soft-beige)",
                            }}
                        >
                            {pack.featured && <Chip size="small" label="Most churches" sx={{ mb: 2, backgroundColor: "var(--muted-blue)", color: "#fff" }} />}
                            <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--deep-brown)" }}>{pack.name}</Typography>
                            <Typography variant="h3" sx={{ my: 1.5, fontWeight: 800, color: "var(--deep-brown)" }}>
                                {formatPrice(pack.priceCents)}
                            </Typography>
                            <Typography sx={{ fontWeight: 600, color: "var(--muted-blue)" }}>
                                {pack.credits.toLocaleString()} credits
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 2, color: "var(--dark-gray)" }}>{pack.blurb}</Typography>
                        </Paper>
                    ))}
                </Box>

                <Alert severity="info" sx={{ mt: 4 }}>
                    Credits never expire, and every new church starts with welcome credits so you can try the
                    analysis before paying anything.
                </Alert>

                {/* Always free */}
                <Paper elevation={0} sx={{ mt: 6, p: 4, borderRadius: 4, backgroundColor: "#fff", border: "1px solid var(--soft-beige)" }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--deep-brown)", mb: 2 }}>
                        Always free, on every account
                    </Typography>
                    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                        {[
                            "Unlimited surveys and questions",
                            "Unlimited anonymous responses",
                            "Share links and printable QR codes",
                            "CSV export of every response",
                            "Unlimited team members",
                            "Spreadsheet import of past surveys",
                        ].map((item) => (
                            <Stack key={item} direction="row" gap={1} alignItems="center">
                                <CheckIcon sx={{ color: "var(--muted-blue)", fontSize: 20 }} />
                                <Typography sx={{ color: "var(--dark-gray)" }}>{item}</Typography>
                            </Stack>
                        ))}
                    </Box>
                </Paper>

                <Box sx={{ textAlign: "center", mt: 7 }}>
                    <Button
                        size="large"
                        variant="contained"
                        onClick={() => router.push("/signup")}
                        sx={{ px: 5, py: 1.5, backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
                    >
                        Register your church
                    </Button>
                </Box>
            </Container>
        </Box>
    );
}
