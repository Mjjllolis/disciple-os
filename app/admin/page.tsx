"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { api } from "@/lib/apiClient";
import type { Church } from "@/lib/types";
import PageSkeleton from "@/app/components/PageSkeleton";

interface Totals {
    churches: number;
    surveys: number;
    responses: number;
    credits: number;
}

export default function AdminPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    const [churches, setChurches] = useState<Church[]>([]);
    const [totals, setTotals] = useState<Totals | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [grantFor, setGrantFor] = useState<Church | null>(null);
    const [grantAmount, setGrantAmount] = useState("500");
    const [grantReason, setGrantReason] = useState("Manual top-up");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await api<{ churches: Church[]; totals: Totals }>("/api/admin/churches");
            setChurches(data.churches);
            setTotals(data.totals);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load the admin view.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
        if (status === "authenticated") void load();
    }, [status, router, load]);

    const grant = async () => {
        if (!grantFor) return;
        setSaving(true);
        try {
            await api(`/api/admin/churches/${grantFor.id}/credits`, {
                json: { delta: Number(grantAmount), reason: grantReason },
            });
            setGrantFor(null);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not adjust credits.");
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <PageSkeleton />
        );
    }

    if (session?.user?.role !== "super_admin") {
        return (
            <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 6 }}>
                <Container maxWidth="sm">
                    <Alert severity="error">
                        This area is for platform administrators only.
                    </Alert>
                    <Button sx={{ mt: 2 }} onClick={() => router.push("/dashboard")}>
                        ← Back to your dashboard
                    </Button>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="lg">
                <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                    Platform admin
                </Typography>
                <Typography sx={{ color: "var(--dark-gray)", mb: 3 }}>
                    Every church on DiscipleShip International.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>{error}</Alert>}

                {totals && (
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, backgroundColor: "var(--surface-muted)", display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <Stat label="Churches" value={totals.churches} />
                        <Stat label="Surveys" value={totals.surveys} />
                        <Stat label="Responses" value={totals.responses} />
                        <Stat label="Credits outstanding" value={totals.credits} />
                    </Paper>
                )}

                <Paper elevation={0} sx={{ mt: 4, borderRadius: 3, border: "1px solid var(--soft-beige)", overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Church</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Surveys</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Responses</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Credits</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {churches.map((c) => (
                                <TableRow key={c.id} hover>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
                                        <Typography variant="caption" sx={{ color: "var(--dark-gray)" }}>
                                            joined {new Date(c.createdAt).toLocaleDateString()}
                                            {c.city ? ` · ${c.city}${c.state ? `, ${c.state}` : ""}` : ""}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: "var(--dark-gray)" }}>{c.contactEmail}</TableCell>
                                    <TableCell align="right">{c.surveyCount ?? 0}</TableCell>
                                    <TableCell align="right">{c.responseCount ?? 0}</TableCell>
                                    <TableCell align="right">{c.credits.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={c.status}
                                            color={c.status === "active" ? "success" : "warning"}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" gap={1} justifyContent="flex-end">
                                            <Button size="small" onClick={() => { setGrantFor(c); setGrantAmount("500"); setGrantReason("Manual top-up"); }}>
                                                Credits
                                            </Button>
                                            <Button size="small" onClick={() => router.push(`/admin/churches/${c.id}`)}>
                                                Open
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {churches.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: "var(--dark-gray)" }}>
                                        No churches have signed up yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>

                <Dialog open={Boolean(grantFor)} onClose={() => setGrantFor(null)} fullWidth maxWidth="xs">
                    <DialogTitle>Adjust credits — {grantFor?.name}</DialogTitle>
                    <DialogContent>
                        <Stack gap={2} sx={{ mt: 1 }}>
                            <Typography variant="body2" sx={{ color: "var(--dark-gray)" }}>
                                Current balance: {grantFor?.credits.toLocaleString()}. Use a negative number to remove credits.
                            </Typography>
                            <TextField
                                label="Credits"
                                type="number"
                                value={grantAmount}
                                onChange={(e) => setGrantAmount(e.target.value)}
                            />
                            <TextField
                                label="Reason"
                                value={grantReason}
                                onChange={(e) => setGrantReason(e.target.value)}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setGrantFor(null)}>Cancel</Button>
                        <Button variant="contained" disabled={saving || !grantReason.trim()} onClick={() => void grant()}>
                            {saving ? "Saving…" : "Apply"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "var(--deep-brown)" }}>
                {value.toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ color: "var(--deep-brown)" }}>
                {label}
            </Typography>
        </Box>
    );
}
