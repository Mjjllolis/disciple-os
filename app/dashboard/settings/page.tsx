"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { DENOMINATION_OPTIONS, SIZE_TIERS } from "@/lib/churchProfile";
import { priceImages, priceSermons } from "@/lib/modules";
import { api } from "@/lib/apiClient";
import { useChurch } from "@/app/components/ChurchProvider";
import { useToast } from "@/app/components/Toast";
import type { AppUser, Church, Invite } from "@/lib/types";
import PageSkeleton from "@/app/components/PageSkeleton";

export default function SettingsPage() {
    const toast = useToast();
    const { reload, user } = useChurch();

    const [church, setChurch] = useState<Church | null>(null);
    const [members, setMembers] = useState<AppUser[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [canManage, setCanManage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("leader");
    const [manualLink, setManualLink] = useState("");

    const load = useCallback(async () => {
        try {
            const [settings, team] = await Promise.all([
                api<{ church: Church; canManage: boolean }>("/api/settings"),
                api<{ members: AppUser[]; invites: Invite[]; canManage: boolean }>("/api/team"),
            ]);
            setChurch(settings.church);
            setCanManage(settings.canManage);

            setMembers(team.members);
            setInvites(team.invites);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const save = async () => {
        if (!church) return;
        setSaving(true);
        try {
            await api("/api/settings", {
                method: "PATCH",
                json: {
                    name: church.name,
                    city: church.city ?? "",
                    state: church.state ?? "",
                    website: church.website ?? "",
                    logoUrl: church.logoUrl ?? "",
                    brandColor: church.brandColor ?? "",
                    denomination: (church.denomination ?? "").trim(),
                    leadPastor: church.leadPastor ?? "",
                    phone: church.phone ?? "",
                    // A locked size is left alone; the server would refuse a change anyway.
                    ...(!church.sizeTierLocked && { sizeTier: church.sizeTier ?? "" }),
                },
            });
            toast.success("Settings saved.");
            void reload();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save.");
        } finally {
            setSaving(false);
        }
    };

    const sendInvite = async () => {
        try {
            const res = await api<{ emailDelivered: boolean; acceptUrl: string }>("/api/team", {
                json: { email: inviteEmail, role: inviteRole },
            });
            setInviteOpen(false);
            setInviteEmail("");
            await load();
            if (res.emailDelivered) {
                toast.success(`Invitation sent to ${inviteEmail}.`);
            } else {
                // Email isn't configured — give the owner the link to pass on.
                setManualLink(res.acceptUrl);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not send that invitation.");
        }
    };

    const changeRole = async (member: AppUser, role: string) => {
        try {
            await api(`/api/team/${member.uid}`, { method: "PATCH", json: { role } });
            await load();
            toast.success("Role updated.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not change that role.");
        }
    };

    const removeMember = async (member: AppUser) => {
        try {
            await api(`/api/team/${member.uid}`, { method: "DELETE" });
            await load();
            toast.success(`${member.email} removed.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not remove them.");
        }
    };

    const revoke = async (invite: Invite) => {
        try {
            await api(`/api/team/invites/${invite.id}`, { method: "DELETE" });
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not revoke.");
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
                <Container maxWidth="md"><Alert severity="error">{error || "Could not load settings."}</Alert></Container>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="md">
                <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                    Settings
                </Typography>
                <Typography sx={{ color: "var(--dark-gray)", mb: 4 }}>
                    Your church profile, branding, and team.
                </Typography>

                {!canManage && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        You&apos;re a leader on this account. Only owners can change these settings.
                    </Alert>
                )}

                <Typography variant="h6" sx={{ mb: 1.5 }}>Church profile</Typography>
                <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
                    <ProfileSection
                        title="About your church"
                        summary={[
                            church.denomination,
                            SIZE_TIERS.find((t) => t.id === church.sizeTier)?.label &&
                                `${SIZE_TIERS.find((t) => t.id === church.sizeTier)?.label} weekly`,
                            church.leadPastor,
                        ]}
                        defaultExpanded
                    >
                        <TextField label="Church name" disabled={!canManage} value={church.name} onChange={(e) => setChurch({ ...church, name: e.target.value })} />
                        {/* Suggestions grouped by tradition; anything typed is kept as-is. */}
                        <Autocomplete
                            freeSolo
                            disabled={!canManage}
                            options={DENOMINATION_OPTIONS}
                            groupBy={(o) => (typeof o === "string" ? "" : o.group)}
                            getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
                            value={church.denomination || null}
                            onChange={(_, v) =>
                                setChurch({ ...church, denomination: typeof v === "string" ? v : (v?.name ?? "") })
                            }
                            inputValue={church.denomination ?? ""}
                            onInputChange={(_, text) => setChurch({ ...church, denomination: text })}
                            isOptionEqualToValue={(o, v) =>
                                (typeof o === "string" ? o : o.name) === (typeof v === "string" ? v : v.name)
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Denomination"
                                    placeholder="Type or pick, e.g. Baptist"
                                    helperText="Pick from the list or type your own."
                                />
                            )}
                        />
                        <TextField
                            select
                            label="Average weekly attendance"
                            disabled={!canManage || church.sizeTierLocked}
                            value={church.sizeTier ?? ""}
                            onChange={(e) => setChurch({ ...church, sizeTier: e.target.value || null })}
                            helperText={
                                church.sizeTierLocked
                                    ? "Confirmed by DiscipleShip. Contact support to change it."
                                    : "Adults and children on a typical Sunday. Sets the credit price of sermons and images."
                            }
                            slotProps={{
                                select: {
                                    renderValue: (v) => SIZE_TIERS.find((t) => t.id === v)?.label ?? "Not set",
                                    displayEmpty: true,
                                },
                                input: church.sizeTierLocked
                                    ? { endAdornment: <LockOutlinedIcon sx={{ color: "var(--ink-2)", mr: 3, fontSize: 18 }} /> }
                                    : undefined,
                                inputLabel: { shrink: true },
                            }}
                        >
                            {SIZE_TIERS.map((t) => (
                                <MenuItem key={t.id} value={t.id} sx={{ display: "flex", gap: 2 }}>
                                    <Box sx={{ flex: 1 }}>{t.label}</Box>
                                    <Typography variant="caption" sx={{ color: "var(--ink-2)" }}>
                                        Sermon {priceSermons(1, { sizeTier: t.id })} · Image {priceImages(1, { sizeTier: t.id })} credits
                                    </Typography>
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Lead pastor"
                            disabled={!canManage}
                            value={church.leadPastor ?? ""}
                            onChange={(e) => setChurch({ ...church, leadPastor: e.target.value })}
                        />
                    </ProfileSection>

                    <ProfileSection
                        title="Location & contact"
                        summary={[[church.city, church.state].filter(Boolean).join(", "), church.phone, church.website]}
                    >
                        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                            <TextField label="City" fullWidth disabled={!canManage} value={church.city ?? ""} onChange={(e) => setChurch({ ...church, city: e.target.value })} />
                            <TextField label="State" fullWidth disabled={!canManage} value={church.state ?? ""} onChange={(e) => setChurch({ ...church, state: e.target.value })} />
                        </Stack>
                        <TextField label="Phone" disabled={!canManage} value={church.phone ?? ""} onChange={(e) => setChurch({ ...church, phone: e.target.value })} />
                        <TextField label="Website" disabled={!canManage} value={church.website ?? ""} onChange={(e) => setChurch({ ...church, website: e.target.value })} placeholder="https://" />
                    </ProfileSection>

                    <ProfileSection
                        title="Branding"
                        summary={["Shown on your public survey and booking pages"]}
                    >
                        <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems="center">
                            <TextField label="Logo URL" fullWidth disabled={!canManage} value={church.logoUrl ?? ""} onChange={(e) => setChurch({ ...church, logoUrl: e.target.value })} placeholder="https://" />
                            <TextField
                                label="Brand colour"
                                disabled={!canManage}
                                value={church.brandColor ?? ""}
                                onChange={(e) => setChurch({ ...church, brandColor: e.target.value })}
                                placeholder="#89a4b0"
                                sx={{ minWidth: 150 }}
                            />
                            <Box sx={{ width: 44, height: 44, borderRadius: 2, flexShrink: 0, border: "1px solid var(--soft-beige)", backgroundColor: church.brandColor || "var(--muted-blue)" }} />
                        </Stack>
                    </ProfileSection>
                </Paper>

                {canManage && (
                    <Button variant="contained" disabled={saving} onClick={() => void save()} sx={{ mt: 2.5 }}>
                        {saving ? "Saving…" : "Save settings"}
                    </Button>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 5, mb: 2 }}>
                    <Typography variant="h6" sx={{ color: "var(--deep-brown)" }}>Team</Typography>
                    {canManage && (
                        <Button startIcon={<PersonAddAltIcon />} onClick={() => setInviteOpen(true)} sx={{ color: "var(--deep-brown)" }}>
                            Invite someone
                        </Button>
                    )}
                </Stack>

                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid var(--soft-beige)", overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Person</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {members.map((m) => (
                                <TableRow key={m.uid} hover>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 600 }}>{m.name || m.email}</Typography>
                                        {m.name && <Typography variant="caption" sx={{ color: "var(--dark-gray)" }}>{m.email}</Typography>}
                                    </TableCell>
                                    <TableCell>
                                        {canManage && m.uid !== church.ownerUid ? (
                                            <TextField
                                                select
                                                size="small"
                                                value={m.role === "owner" ? "owner" : "leader"}
                                                onChange={(e) => void changeRole(m, e.target.value)}
                                                sx={{ minWidth: 120 }}
                                            >
                                                <MenuItem value="leader">Leader</MenuItem>
                                                <MenuItem value="owner">Owner</MenuItem>
                                            </TextField>
                                        ) : (
                                            <Chip size="small" label={m.uid === church.ownerUid ? "Primary owner" : m.role} variant="outlined" />
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {canManage && m.uid !== church.ownerUid && m.uid !== user?.uid && (
                                            <IconButton size="small" onClick={() => void removeMember(m)}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>

                {invites.length > 0 && (
                    <>
                        <Typography variant="body2" sx={{ mt: 3, mb: 1, color: "var(--dark-gray)" }}>
                            Pending invitations
                        </Typography>
                        <Stack gap={1}>
                            {invites.map((i) => (
                                <Paper key={i.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid var(--soft-beige)" }}>
                                    <Stack direction="row" alignItems="center" gap={2}>
                                        <Typography sx={{ flexGrow: 1 }}>{i.email}</Typography>
                                        <Chip size="small" label={i.role} variant="outlined" />
                                        <Tooltip title="Copy invitation link">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    void navigator.clipboard.writeText(`${window.location.origin}/invite/${i.token}`);
                                                    toast.success("Invitation link copied.");
                                                }}
                                            >
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {canManage && (
                                            <Button size="small" color="error" onClick={() => void revoke(i)}>Revoke</Button>
                                        )}
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    </>
                )}

                <Divider sx={{ my: 5 }} />
                <Typography variant="body2" sx={{ color: "var(--dark-gray)" }}>
                    <strong>Owners</strong> manage settings, the team, and credits.{" "}
                    <strong>Leaders</strong> can build surveys, run analyses, and use every enabled module.
                </Typography>

                <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="xs">
                    <DialogTitle>Invite a teammate</DialogTitle>
                    <DialogContent>
                        <Stack gap={2} sx={{ mt: 1 }}>
                            <TextField label="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                            <TextField select label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                                <MenuItem value="leader">Leader</MenuItem>
                                <MenuItem value="owner">Owner</MenuItem>
                            </TextField>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
                        <Button variant="contained" disabled={!inviteEmail.trim()} onClick={() => void sendInvite()} sx={{ backgroundColor: "var(--muted-blue)" }}>
                            Send invitation
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={Boolean(manualLink)} onClose={() => setManualLink("")} fullWidth maxWidth="sm">
                    <DialogTitle>Share this invitation link</DialogTitle>
                    <DialogContent>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Email isn&apos;t configured on this deployment, so we couldn&apos;t send it automatically.
                            Send them this link yourself.
                        </Alert>
                        <TextField fullWidth value={manualLink} InputProps={{ readOnly: true }} />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => {
                                void navigator.clipboard.writeText(manualLink);
                                toast.success("Copied.");
                            }}
                        >
                            Copy link
                        </Button>
                        <Button onClick={() => setManualLink("")}>Done</Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
}

/** A collapsible group of profile fields; closed, it shows what's filled in. */
function ProfileSection({
    title,
    summary,
    defaultExpanded = false,
    children,
}: {
    title: string;
    summary: (string | null | undefined | false)[];
    defaultExpanded?: boolean;
    children: React.ReactNode;
}) {
    const filled = summary.filter((v): v is string => Boolean(v));
    return (
        <Accordion
            defaultExpanded={defaultExpanded}
            disableGutters
            elevation={0}
            sx={{ "&:before": { display: "none" }, "& + &": { borderTop: "1px solid var(--border)" } }}
        >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, py: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
                    <Typography variant="body2" noWrap sx={{ color: "var(--ink-2)" }}>
                        {filled.length ? filled.join(" · ") : "Not filled in yet"}
                    </Typography>
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Stack gap={2}>{children}</Stack>
            </AccordionDetails>
        </Accordion>
    );
}
