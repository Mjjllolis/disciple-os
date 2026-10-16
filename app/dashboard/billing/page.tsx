"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { api } from "@/lib/apiClient";
import { MODULE_LIST, unitPrice } from "@/lib/modules";
import { formatPrice, type CreditPack } from "@/lib/payments";
import { useChurch } from "@/app/components/ChurchProvider";
import { useToast } from "@/app/components/Toast";
import type { CreditTransaction } from "@/lib/types";
import PageSkeleton from "@/app/components/PageSkeleton";

interface BillingPayload {
    credits: number;
    creditsPerResponse: number;
    transactions: CreditTransaction[];
    packs: CreditPack[];
    paymentsEnabled: boolean;
    canPurchase: boolean;
}

/** useSearchParams needs a Suspense boundary or this page can't prerender. */
export default function BillingPage() {
    return (
        <Suspense
            fallback={
                <PageSkeleton />
            }
        >
            <BillingInner />
        </Suspense>
    );
}

function BillingInner() {
    const { modules, reload, church } = useChurch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();

    const [credits, setCredits] = useState(0);
    const [perResponse, setPerResponse] = useState(1);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [packs, setPacks] = useState<CreditPack[]>([]);
    const [paymentsEnabled, setPaymentsEnabled] = useState(false);
    const [canPurchase, setCanPurchase] = useState(false);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState("");
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            const d = await api<BillingPayload>("/api/billing");
            setCredits(d.credits);
            setPerResponse(d.creditsPerResponse);
            setTransactions(d.transactions);
            setPacks(d.packs);
            setPaymentsEnabled(d.paymentsEnabled);
            setCanPurchase(d.canPurchase);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load billing.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    // Coming back from Stripe. Credits are granted by the webhook, which may
    // land a moment after the redirect, so refresh once shortly after.
    useEffect(() => {
        const outcome = searchParams.get("purchase");
        if (!outcome) return;

        if (outcome === "success") {
            toast.success("Payment received — your credits are being added.");
            const timer = setTimeout(() => {
                void load();
                void reload();
            }, 2500);
            router.replace("/dashboard/billing");
            return () => clearTimeout(timer);
        }
        if (outcome === "cancelled") {
            toast.notify("Checkout cancelled. You were not charged.", "info");
            router.replace("/dashboard/billing");
        }
    }, [searchParams, toast, load, reload, router]);

    const buy = async (pack: CreditPack) => {
        setBuying(pack.id);
        try {
            const { url } = await api<{ url: string }>("/api/billing/checkout", {
                json: { packId: pack.id },
            });
            window.location.href = url;
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not start checkout.");
            setBuying("");
        }
    };

    if (loading) {
        return (
            <PageSkeleton />
        );
    }

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="md">
                <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                    Analysis credits
                </Typography>
                <Typography sx={{ color: "var(--dark-gray)", mb: 4 }}>
                    Building and collecting surveys is free. Credits are spent only when you run an AI analysis.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: "var(--surface-muted)" }}>
                    <Typography variant="h2" sx={{ fontWeight: 700, color: "var(--deep-brown)" }}>
                        {credits.toLocaleString()}
                    </Typography>
                    <Typography sx={{ color: "var(--deep-brown)" }}>
                        credits available — {perResponse} credit per response analyzed
                    </Typography>
                </Paper>

                <Typography variant="h6" sx={{ mt: 5, mb: 2, color: "var(--deep-brown)" }}>
                    Buy credits
                </Typography>

                {!canPurchase && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Only a church owner can purchase credits.
                    </Alert>
                )}

                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
                    {packs.map((pack) => (
                        <Paper
                            key={pack.id}
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                textAlign: "center",
                                backgroundColor: pack.featured ? "var(--soft-beige)" : "#fff",
                                border: pack.featured ? "2px solid var(--muted-blue)" : "1px solid var(--soft-beige)",
                            }}
                        >
                            {pack.featured && (
                                <Chip size="small" label="Most churches" sx={{ mb: 1.5, backgroundColor: "var(--muted-blue)", color: "#fff" }} />
                            )}
                            <Typography sx={{ fontWeight: 700, color: "var(--deep-brown)" }}>{pack.name}</Typography>
                            <Typography variant="h4" sx={{ my: 1, fontWeight: 800, color: "var(--deep-brown)" }}>
                                {formatPrice(pack.priceCents)}
                            </Typography>
                            <Typography sx={{ fontWeight: 600, color: "var(--muted-blue)" }}>
                                {pack.credits.toLocaleString()} credits
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1.5, mb: 2, color: "var(--dark-gray)", minHeight: 40 }}>
                                {pack.blurb}
                            </Typography>
                            <Button
                                fullWidth
                                variant={pack.featured ? "contained" : "outlined"}
                                disabled={!canPurchase || !paymentsEnabled || Boolean(buying)}
                                onClick={() => void buy(pack)}
                                sx={
                                    pack.featured
                                        ? { backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }
                                        : { color: "var(--deep-brown)", borderColor: "var(--muted-blue)" }
                                }
                            >
                                {buying === pack.id ? "Redirecting…" : "Buy"}
                            </Button>
                        </Paper>
                    ))}
                </Box>

                <Typography variant="h6" sx={{ mt: 5, mb: 2, color: "var(--deep-brown)" }}>
                    What credits are spent on
                </Typography>
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                    <Table size="small">
                        <TableBody>
                            {MODULE_LIST.map((m) => {
                                const enabled = modules?.find((x) => x.id === m.id)?.enabled ?? m.includedByDefault;
                                return (
                                    <TableRow key={m.id}>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 600, color: enabled ? "var(--deep-brown)" : "var(--dark-gray)" }}>
                                                {m.name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "var(--dark-gray)" }}>
                                                {enabled ? m.blurb : "Not enabled for your church"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap", fontWeight: 600, color: "var(--muted-blue)" }}>
                                            {m.pricing.credits === 0 ? "Free" : `${unitPrice(m.id, church)} / ${m.pricing.unit}`}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Paper>

                {!paymentsEnabled && (
                    <Alert severity="info" sx={{ mt: 3 }}>
                        Card payments aren&apos;t switched on for this deployment yet. Your DiscipleShip
                        International administrator can add credits or enable a module immediately.
                    </Alert>
                )}

                <Typography variant="h6" sx={{ mt: 5, mb: 2, color: "var(--deep-brown)" }}>
                    History
                </Typography>

                {transactions.length === 0 ? (
                    <Typography sx={{ color: "var(--dark-gray)" }}>No credit activity yet.</Typography>
                ) : (
                    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid var(--soft-beige)", overflowX: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Activity</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Change</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }} align="right">Balance</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transactions.map((t) => (
                                    <TableRow key={t.id} hover>
                                        <TableCell sx={{ whiteSpace: "nowrap", color: "var(--dark-gray)" }}>
                                            {new Date(t.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{t.reason}</TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                size="small"
                                                label={`${t.delta > 0 ? "+" : ""}${t.delta}`}
                                                color={t.delta > 0 ? "success" : "default"}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="right">{t.balanceAfter.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Container>
        </Box>
    );
}
