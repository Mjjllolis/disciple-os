"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { api } from "@/lib/apiClient";
import ModuleGate from "@/app/components/ModuleGate";
import { useToast } from "@/app/components/Toast";
import type { Tour, TourStop, VisitBooking, VisitSlot } from "@/lib/types";

export default function ToursPage() {
    return (
        <ModuleGate moduleId="tours">
            <ToursInner />
        </ModuleGate>
    );
}

function ToursInner() {
    const [tab, setTab] = useState(0);
    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="lg">
                <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                    Tours &amp; Visits
                </Typography>
                <Typography sx={{ color: "var(--dark-gray)" }}>
                    Plan trips your team takes, and let guests book a visit to you.
                </Typography>

                <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mt: 3, borderBottom: "1px solid var(--soft-beige)" }}>
                    <Tab label="Mission trips" sx={{ textTransform: "none" }} />
                    <Tab label="Guest visits" sx={{ textTransform: "none" }} />
                </Tabs>

                {tab === 0 ? <MissionTrips /> : <GuestVisits />}
            </Container>
        </Box>
    );
}

/* ------------------------------------------------------------ mission --- */

function MissionTrips() {
    const toast = useToast();
    const [tours, setTours] = useState<Tour[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Tour | null>(null);
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState("");

    const load = useCallback(async () => {
        try {
            const { tours: list } = await api<{ tours: Tour[] }>("/api/tours");
            setTours(list);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not load tours.");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void load();
    }, [load]);

    const create = async () => {
        try {
            const { tour } = await api<{ tour: Tour }>("/api/tours", {
                json: { kind: "mission_trip", title, stops: [] },
            });
            setCreating(false);
            setTitle("");
            setTours((t) => [tour, ...t]);
            setEditing(tour);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not create that tour.");
        }
    };

    const saveStops = async (tour: Tour, stops: TourStop[]) => {
        try {
            const { tour: updated } = await api<{ tour: Tour }>(`/api/tours/${tour.id}`, {
                method: "PATCH",
                json: { stops },
            });
            setTours((list) => list.map((t) => (t.id === updated.id ? updated : t)));
            setEditing(updated);
            toast.success("Itinerary saved.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save.");
        }
    };

    const remove = async (tour: Tour) => {
        try {
            await api(`/api/tours/${tour.id}`, { method: "DELETE" });
            setTours((list) => list.filter((t) => t.id !== tour.id));
            toast.success("Tour deleted.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete.");
        }
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{ mt: 3 }}>
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreating(true)}
                sx={{ backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
            >
                New trip
            </Button>

            {tours.length === 0 ? (
                <Paper elevation={0} sx={{ mt: 3, p: 6, borderRadius: 3, textAlign: "center", border: "1px dashed var(--soft-beige)" }}>
                    <Typography sx={{ color: "var(--dark-gray)" }}>
                        No trips planned. Create one, then add each stop with dates and a host contact.
                    </Typography>
                </Paper>
            ) : (
                <Stack gap={2} sx={{ mt: 3 }}>
                    {tours.map((tour) => (
                        <Paper key={tour.id} elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                                <Box>
                                    <Typography sx={{ fontWeight: 600, color: "var(--deep-brown)" }}>{tour.title}</Typography>
                                    <Typography variant="body2" sx={{ color: "var(--dark-gray)" }}>
                                        {tour.stops.length} stops
                                        {tour.stops.length > 0 &&
                                            ` · ${tour.stops[0].startDate} → ${tour.stops[tour.stops.length - 1].endDate ?? tour.stops[tour.stops.length - 1].startDate}`}
                                    </Typography>
                                </Box>
                                <Stack direction="row" gap={1}>
                                    <Button size="small" onClick={() => setEditing(tour)}>Edit itinerary</Button>
                                    <IconButton size="small" onClick={() => void remove(tour)}>
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            )}

            <Dialog open={creating} onClose={() => setCreating(false)} fullWidth maxWidth="xs">
                <DialogTitle>New trip</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Trip name"
                        sx={{ mt: 1 }}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. East Africa 2027"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreating(false)}>Cancel</Button>
                    <Button variant="contained" disabled={!title.trim()} onClick={() => void create()}>Create</Button>
                </DialogActions>
            </Dialog>

            {editing && (
                <ItineraryDialog
                    tour={editing}
                    onClose={() => setEditing(null)}
                    onSave={(stops) => void saveStops(editing, stops)}
                />
            )}
        </Box>
    );
}

function ItineraryDialog({
    tour,
    onClose,
    onSave,
}: {
    tour: Tour;
    onClose: () => void;
    onSave: (stops: TourStop[]) => void;
}) {
    const [stops, setStops] = useState<TourStop[]>(tour.stops);

    const update = (i: number, patch: Partial<TourStop>) =>
        setStops((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));

    const add = () =>
        setStops((list) => [
            ...list,
            {
                id: `new-${Date.now()}-${list.length}`,
                location: "",
                startDate: new Date().toISOString().slice(0, 10),
                endDate: null,
                status: "planned",
            },
        ]);

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{tour.title} — itinerary</DialogTitle>
            <DialogContent>
                <Stack gap={2} sx={{ mt: 1 }}>
                    {stops.map((stop, i) => (
                        <Paper key={stop.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid var(--soft-beige)" }}>
                            <Stack gap={1.5}>
                                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                                    <TextField
                                        size="small"
                                        label="Location or host church"
                                        fullWidth
                                        value={stop.location}
                                        onChange={(e) => update(i, { location: e.target.value })}
                                    />
                                    <TextField size="small" label="City" value={stop.city ?? ""} onChange={(e) => update(i, { city: e.target.value })} />
                                    <TextField size="small" label="Country" value={stop.country ?? ""} onChange={(e) => update(i, { country: e.target.value })} />
                                </Stack>
                                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                                    <TextField
                                        size="small"
                                        type="date"
                                        label="Arrives"
                                        InputLabelProps={{ shrink: true }}
                                        value={stop.startDate}
                                        onChange={(e) => update(i, { startDate: e.target.value })}
                                    />
                                    <TextField
                                        size="small"
                                        type="date"
                                        label="Departs"
                                        InputLabelProps={{ shrink: true }}
                                        value={stop.endDate ?? ""}
                                        onChange={(e) => update(i, { endDate: e.target.value })}
                                    />
                                    <TextField
                                        size="small"
                                        select
                                        label="Status"
                                        value={stop.status}
                                        onChange={(e) => update(i, { status: e.target.value as TourStop["status"] })}
                                        sx={{ minWidth: 140 }}
                                    >
                                        <MenuItem value="planned">Planned</MenuItem>
                                        <MenuItem value="confirmed">Confirmed</MenuItem>
                                        <MenuItem value="cancelled">Cancelled</MenuItem>
                                    </TextField>
                                    <IconButton onClick={() => setStops((l) => l.filter((_, j) => j !== i))}>
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                                    <TextField size="small" label="Host name" fullWidth value={stop.hostName ?? ""} onChange={(e) => update(i, { hostName: e.target.value })} />
                                    <TextField size="small" label="Host email" fullWidth value={stop.hostEmail ?? ""} onChange={(e) => update(i, { hostEmail: e.target.value })} />
                                </Stack>
                                <TextField size="small" label="Notes" multiline minRows={2} value={stop.notes ?? ""} onChange={(e) => update(i, { notes: e.target.value })} />
                            </Stack>
                        </Paper>
                    ))}
                    <Button startIcon={<AddIcon />} onClick={add} sx={{ alignSelf: "flex-start", color: "var(--deep-brown)" }}>
                        Add a stop
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => onSave(stops)}
                    disabled={stops.some((s) => !s.location.trim())}
                    sx={{ backgroundColor: "var(--muted-blue)" }}
                >
                    Save itinerary
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/* ------------------------------------------------------------- visits --- */

function GuestVisits() {
    const toast = useToast();
    const [slots, setSlots] = useState<VisitSlot[]>([]);
    const [bookings, setBookings] = useState<VisitBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", startsAt: "", durationMinutes: 60, capacity: 10 });

    const load = useCallback(async () => {
        try {
            const [s, b] = await Promise.all([
                api<{ slots: VisitSlot[] }>("/api/visits/slots"),
                api<{ bookings: VisitBooking[] }>("/api/visits/bookings"),
            ]);
            setSlots(s.slots);
            setBookings(b.bookings);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not load visits.");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void load();
    }, [load]);

    const create = async () => {
        try {
            await api("/api/visits/slots", { json: form });
            setOpen(false);
            setForm({ title: "", description: "", startsAt: "", durationMinutes: 60, capacity: 10 });
            await load();
            toast.success("Visit time created. Share its link with guests.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not create that time.");
        }
    };

    const toggle = async (slot: VisitSlot) => {
        try {
            await api(`/api/visits/slots/${slot.id}`, {
                method: "PATCH",
                json: { status: slot.status === "open" ? "closed" : "open" },
            });
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not update.");
        }
    };

    if (loading) return <Loading />;

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    return (
        <Box sx={{ mt: 3 }}>
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpen(true)}
                sx={{ backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
            >
                New visit time
            </Button>

            {slots.length === 0 ? (
                <Paper elevation={0} sx={{ mt: 3, p: 6, borderRadius: 3, textAlign: "center", border: "1px dashed var(--soft-beige)" }}>
                    <Typography sx={{ color: "var(--dark-gray)" }}>
                        No visit times yet. Create one and share its link — guests book without making an account.
                    </Typography>
                </Paper>
            ) : (
                <Stack gap={2} sx={{ mt: 3 }}>
                    {slots.map((slot) => {
                        const url = `${origin}/v/${slot.publicSlug}`;
                        return (
                            <Paper key={slot.id} elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid var(--soft-beige)" }}>
                                <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap" alignItems="center">
                                    <Box sx={{ minWidth: 220 }}>
                                        <Stack direction="row" gap={1} alignItems="center">
                                            <Typography sx={{ fontWeight: 600, color: "var(--deep-brown)" }}>{slot.title}</Typography>
                                            <Chip size="small" label={slot.status} color={slot.status === "open" ? "success" : "default"} variant="outlined" />
                                        </Stack>
                                        <Typography variant="body2" sx={{ color: "var(--dark-gray)" }}>
                                            {new Date(slot.startsAt).toLocaleString()} · {slot.durationMinutes} min ·{" "}
                                            {slot.booked}/{slot.capacity} booked
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" gap={1} alignItems="center">
                                        <TextField size="small" value={url} InputProps={{ readOnly: true }} sx={{ width: { xs: 200, md: 300 } }} />
                                        <Tooltip title="Copy booking link">
                                            <IconButton
                                                onClick={() => {
                                                    void navigator.clipboard.writeText(url);
                                                    toast.success("Link copied.");
                                                }}
                                            >
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Button size="small" onClick={() => void toggle(slot)}>
                                            {slot.status === "open" ? "Close" : "Reopen"}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            )}

            <Typography variant="h6" sx={{ mt: 5, mb: 2, color: "var(--deep-brown)" }}>
                Bookings
            </Typography>
            {bookings.length === 0 ? (
                <Typography sx={{ color: "var(--dark-gray)" }}>No one has booked yet.</Typography>
            ) : (
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid var(--soft-beige)", overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Party</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Visit</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bookings.map((b) => {
                                const slot = slots.find((s) => s.id === b.slotId);
                                return (
                                    <TableRow key={b.id} hover>
                                        <TableCell>{b.name}</TableCell>
                                        <TableCell>{b.email}</TableCell>
                                        <TableCell>{b.phone || "—"}</TableCell>
                                        <TableCell align="right">{b.partySize}</TableCell>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                                            {slot ? new Date(slot.startsAt).toLocaleString() : "—"}
                                        </TableCell>
                                        <TableCell>{b.notes || "—"}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Paper>
            )}

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>New visit time</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Newcomers' tour after second service"
                        />
                        <TextField
                            label="Description"
                            multiline
                            minRows={2}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                        <TextField
                            label="Date and time"
                            type="datetime-local"
                            InputLabelProps={{ shrink: true }}
                            value={form.startsAt}
                            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                        />
                        <Stack direction="row" gap={2}>
                            <TextField
                                label="Minutes"
                                type="number"
                                value={form.durationMinutes}
                                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                            />
                            <TextField
                                label="Capacity"
                                type="number"
                                value={form.capacity}
                                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={!form.title.trim() || !form.startsAt}
                        onClick={() => void create()}
                        sx={{ backgroundColor: "var(--muted-blue)" }}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function Loading() {
    return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
        </Box>
    );
}
