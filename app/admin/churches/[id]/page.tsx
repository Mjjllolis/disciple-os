"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Divider,
    FormControlLabel,
    MenuItem,
    Paper,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { api } from "@/lib/apiClient";
import { MODULE_LIST, hasModule } from "@/lib/modules";
import { SIZE_TIERS } from "@/lib/churchProfile";
import { useToast } from "@/app/components/Toast";
import type { Church, CreditTransaction, ModuleId, Survey } from "@/lib/types";
import PageSkeleton from "@/app/components/PageSkeleton";

export default function AdminChurchPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();

    const [church, setChurch] = useState<Church | null>(null);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await api<{ church: Church; surveys: Survey[]; transactions: CreditTransaction[] }>(
                `/api/admin/churches/${id}`
            );
            setChurch(data.church);
            setSurveys(data.surveys);
            setTransactions(data.transactions);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load this church.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    const toggleModule = async (moduleId: ModuleId, enabled: boolean) => {
        setBusy(true);
        try {
            await api(`/api/admin/churches/${id}/modules`, {
                json: { moduleId, enabled, reason: "Changed from platform admin" },
            });
            await load();
            toast.success(`${enabled ? "Enabled" : "Disabled"} that module.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not change that module.");
        } finally {
            setBusy(false);
        }
    };

    const toggleStatus = async () => {
        if (!church) return;
        setBusy(true);
        try {
            await api(`/api/admin/churches/${id}`, {
                method: "PATCH",
                json: { status: church.status === "active" ? "suspended" : "active" },
            });
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not update the church.");
        } finally {
            setBusy(false);
        }
    };

    // Size sets the church's prices; confirming it with the lock stops the owner changing it.
    const updateSize = async (patch: { sizeTier?: string; sizeTierLocked?: boolean }) => {
        setBusy(true);
        try {
            await api(`/api/admin/churches/${id}`, { method: "PATCH", json: patch });
            await load();
            toast.success("Church size updated.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not update the church size.");
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <PageSkeleton />
        );
    }

    if (!church) {
        return (
            <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 6 }}>
                <Container maxWidth="md">
                    <Alert severity="error">{error || "Church not found."}</Alert>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="lg">
                <Button onClick={() => router.push("/admin")} sx={{ color: "var(--dark-gray)", mb: 2 }}>
                    ← All churches
                </Button>

                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                            {church.name}
                        </Typography>
                        <Typography sx={{ color: "var(--dark-gray)" }}>
                            {church.contactEmail} · {church.credits.toLocaleString()} credits ·{" "}
                            <Chip size="small" label={church.status} variant="outlined" />
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        color={church.status === "active" ? "warning" : "success"}
                        disabled={busy}
                        onClick={() => void toggleStatus()}
                    >
                        {church.status === "active" ? "Suspend church" : "Reactivate church"}
                    </Button>
                </Stack>

                {error && <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError("")}>{error}</Alert>}

                <Typography variant="h6" sx={{ mt: 5, mb: 1, color: "var(--deep-brown)" }}>
                    Profile
                </Typography>
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                    <Typography variant="body2" sx={{ color: "var(--dark-gray)" }}>
                        {[church.denomination, church.leadPastor && `Pastor ${church.leadPastor}`, [church.city, church.state].filter(Boolean).join(", "), church.phone]
                            .filter(Boolean)
                            .join(" · ") || "No profile details yet."}
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }} sx={{ mt: 2 }}>
                        <TextField
                            select
                            size="small"
                            label="Weekly attendance (sets pricing)"
                            value={church.sizeTier ?? ""}
                            disabled={busy}
                            onChange={(e) => void updateSize({ sizeTier: e.target.value })}
                            sx={{ minWidth: 260 }}
                        >
                            <MenuItem value="">Not set (priced as smallest)</MenuItem>
                            {SIZE_TIERS.map((t) => (
                                <MenuItem key={t.id} value={t.id}>
                                    {t.label} · ×{t.multiplier}
                                </MenuItem>
                            ))}
                        </TextField>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={Boolean(church.sizeTierLocked)}
                                    disabled={busy}
                                    onChange={(e) => void updateSize({ sizeTierLocked: e.target.checked })}
                                />
                            }
                            label="Confirmed (owner can't change it)"
                        />
                    </Stack>
                </Paper>

                <Typography variant="h6" sx={{ mt: 5, mb: 1, color: "var(--deep-brown)" }}>
                    Modules
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--dark-gray)", mb: 2 }}>
                    Switch paid add-ons on for this church. Changes take effect immediately.
                </Typography>
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                    <Stack divider={<Divider />}>
                        {MODULE_LIST.map((m) => {
                            const enabled = hasModule(church.modules, m.id);
                            return (
                                <Stack key={m.id} direction="row" alignItems="center" gap={2} sx={{ p: 2 }}>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Stack direction="row" gap={1} alignItems="center">
                                            <Typography sx={{ fontWeight: 600, color: "var(--deep-brown)" }}>{m.name}</Typography>
                                            {m.includedByDefault && <Chip size="small" label="Included" variant="outlined" />}
                                        </Stack>
                                        <Typography variant="body2" sx={{ color: "var(--dark-gray)" }}>
                                            {m.blurb}
                                            {m.pricing.credits > 0 && ` — ${m.pricing.credits} credits per ${m.pricing.unit}`}
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={enabled}
                                        disabled={busy}
                                        onChange={(e) => void toggleModule(m.id, e.target.checked)}
                                    />
                                </Stack>
                            );
                        })}
                    </Stack>
                </Paper>

                <Typography variant="h6" sx={{ mt: 5, mb: 2, color: "var(--deep-brown)" }}>
                    Surveys
                </Typography>
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid var(--soft-beige)", overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Questions</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Responses</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {surveys.map((s) => (
                                <TableRow key={s.id} hover>
                                    <TableCell>{s.title}</TableCell>
                                    <TableCell><Chip size="small" label={s.status} variant="outlined" /></TableCell>
                                    <TableCell align="right">{s.questions.length}</TableCell>
                                    <TableCell align="right">{s.responseCount ?? 0}</TableCell>
                                    <TableCell sx={{ color: "var(--dark-gray)" }}>
                                        {new Date(s.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button size="small" onClick={() => router.push(`/dashboard/surveys/${s.id}`)}>
                                            Open
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {surveys.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: "var(--dark-gray)" }}>
                                        No surveys yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>

                <Typography variant="h6" sx={{ mt: 5, mb: 2, color: "var(--deep-brown)" }}>
                    Credit ledger
                </Typography>
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid var(--soft-beige)", overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Change</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Balance</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactions.map((t) => (
                                <TableRow key={t.id} hover>
                                    <TableCell sx={{ whiteSpace: "nowrap", color: "var(--dark-gray)" }}>
                                        {new Date(t.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>{t.reason}</TableCell>
                                    <TableCell align="right">{t.delta > 0 ? `+${t.delta}` : t.delta}</TableCell>
                                    <TableCell align="right">{t.balanceAfter.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: "var(--dark-gray)" }}>
                                        No credit activity.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            </Container>
        </Box>
    );
}
