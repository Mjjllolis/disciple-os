"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { api } from "@/lib/apiClient";
import ModuleGate from "@/app/components/ModuleGate";
import { useToast } from "@/app/components/Toast";
import type { Sermon, SermonPoint } from "@/lib/types";
import PageSkeleton from "@/app/components/PageSkeleton";

export default function SermonPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <ModuleGate moduleId="sermon_builder">
            <SermonInner id={use(params).id} />
        </ModuleGate>
    );
}

function SermonInner({ id }: { id: string }) {
    const router = useRouter();
    const toast = useToast();

    const [sermon, setSermon] = useState<Sermon | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    // Opens as a readable outline; Edit switches to the form.
    const [editing, setEditing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { sermon: s } = await api<{ sermon: Sermon }>(`/api/sermons/${id}`);
            setSermon(s);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load this sermon.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    const edit = (patch: Partial<Sermon>) => {
        setSermon((s) => (s ? { ...s, ...patch } : s));
        setDirty(true);
    };

    const editPoint = (index: number, patch: Partial<SermonPoint>) => {
        setSermon((s) =>
            s ? { ...s, points: s.points.map((p, i) => (i === index ? { ...p, ...patch } : p)) } : s
        );
        setDirty(true);
    };

    const save = async () => {
        if (!sermon) return;
        setSaving(true);
        try {
            await api(`/api/sermons/${id}`, {
                method: "PATCH",
                json: {
                    title: sermon.title,
                    bigIdea: sermon.bigIdea,
                    scripture: sermon.scripture,
                    points: sermon.points,
                    illustrations: sermon.illustrations,
                    application: sermon.application,
                    closingPrayer: sermon.closingPrayer,
                },
            });
            setDirty(false);
            toast.success("Saved.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save.");
        } finally {
            setSaving(false);
        }
    };

    const exportDocx = async () => {
        if (!sermon) return;
        const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300 } });
        const body = (text: string) => new Paragraph({ children: [new TextRun(text)], spacing: { after: 120 } });

        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({ text: sermon.title, heading: HeadingLevel.TITLE }),
                        ...(sermon.bigIdea ? [new Paragraph({ children: [new TextRun({ text: sermon.bigIdea, italics: true })] })] : []),
                        ...(sermon.scripture.length ? [heading("Scripture"), ...sermon.scripture.map(body)] : []),
                        heading("Outline"),
                        ...sermon.points.flatMap((p, i) => [
                            new Paragraph({ text: `${i + 1}. ${p.heading}`, heading: HeadingLevel.HEADING_3 }),
                            ...(p.verses.length ? [body(p.verses.join(" · "))] : []),
                            body(p.body),
                        ]),
                        ...(sermon.illustrations.length ? [heading("Illustrations"), ...sermon.illustrations.map((t) => body(`• ${t}`))] : []),
                        ...(sermon.application.length ? [heading("Application"), ...sermon.application.map((t) => body(`• ${t}`))] : []),
                        ...(sermon.closingPrayer ? [heading("Closing prayer"), body(sermon.closingPrayer)] : []),
                    ],
                },
            ],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${sermon.title.replace(/[^\w\s-]/g, "").slice(0, 60) || "sermon"}.docx`);
    };

    const remove = async () => {
        setConfirmDelete(false);
        try {
            await api(`/api/sermons/${id}`, { method: "DELETE" });
            toast.success("Sermon deleted.");
            router.push("/dashboard/sermons");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete.");
        }
    };

    if (loading) {
        return (
            <PageSkeleton />
        );
    }

    if (!sermon) {
        return (
            <Box sx={{ py: 6 }}>
                <Container maxWidth="md"><Alert severity="error">{error || "Sermon not found."}</Alert></Container>
            </Box>
        );
    }

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Container maxWidth="lg">
                <Button onClick={() => router.push("/dashboard/sermons")} sx={{ color: "var(--ink-2)", mb: 2, ml: -1 }}>
                    ← All sermons
                </Button>

                <Box
                    sx={{
                        display: "grid",
                        gap: { xs: 3, md: 6 },
                        // The contents rail links into the read view, so it's hidden while editing.
                        gridTemplateColumns: { xs: "1fr", md: editing ? "minmax(0, 1fr)" : "minmax(0, 1fr) 260px" },
                        alignItems: "start",
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap" alignItems="center">
                            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                                {sermon.weekNumber && (
                                    <Typography variant="overline" sx={{ color: "var(--gold)" }}>
                                        Week {sermon.weekNumber}
                                    </Typography>
                                )}
                                {sermon.sourceThemeLabel && (
                                    <Chip size="small" variant="outlined" label={`From: ${sermon.sourceThemeLabel}`} />
                                )}
                            </Stack>
                            <Stack direction="row" gap={1} alignItems="center">
                                <Button startIcon={<DownloadIcon />} onClick={() => void exportDocx()} sx={{ color: "var(--ink)" }}>
                                    Word
                                </Button>
                                <Button
                                    startIcon={<SlideshowOutlinedIcon />}
                                    disabled={dirty}
                                    title={dirty ? "Save your changes first, so the slides use them" : undefined}
                                    onClick={() => router.push(`/dashboard/sermons/${id}/slides`)}
                                    sx={{ color: "var(--ink)" }}
                                >
                                    {sermon.slides ? "View slides" : "Slides"}
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={editing ? undefined : <EditOutlinedIcon />}
                                    onClick={() => setEditing((e) => !e)}
                                    sx={{ color: "var(--ink)", backgroundColor: "var(--surface)" }}
                                >
                                    {editing ? "Done" : "Edit"}
                                </Button>
                                {(dirty || saving) && (
                                    <Button variant="contained" disabled={saving} onClick={() => void save()}>
                                        {saving ? "Saving…" : "Save changes"}
                                    </Button>
                                )}
                            </Stack>
                        </Stack>

                        {editing ? (
                            <EditView sermon={sermon} edit={edit} editPoint={editPoint} />
                        ) : (
                            <ReadView sermon={sermon} />
                        )}
                    </Box>

                    {/* Contents: jump to any part of the outline. */}
                    {!editing && (
                    <Box
                        component="nav"
                        sx={{ display: { xs: "none", md: "block" }, position: "sticky", top: 96 }}
                    >
                        <Typography variant="overline" sx={{ color: "var(--ink-2)" }}>
                            Contents
                        </Typography>
                        <Stack sx={{ mt: 1, borderLeft: "2px solid var(--border)" }}>
                            {[
                                ["big-idea", "Big idea"],
                                ...sermon.points.map((p, i) => [`point-${i + 1}`, `${i + 1}. ${p.heading || "Untitled point"}`]),
                                ...(sermon.illustrations.length ? [["illustrations", "Illustrations"]] : []),
                                ...(sermon.application.length ? [["application", "This week"]] : []),
                                ...(sermon.closingPrayer ? [["prayer", "Closing prayer"]] : []),
                            ].map(([anchor, label]) => (
                                <Typography
                                    key={anchor}
                                    component="a"
                                    href={`#${anchor}`}
                                    variant="body2"
                                    sx={{
                                        pl: 2,
                                        py: 0.75,
                                        ml: "-2px",
                                        borderLeft: "2px solid transparent",
                                        color: "var(--ink-2)",
                                        lineHeight: 1.35,
                                        "&:hover": { color: "var(--ink)", borderLeftColor: "var(--gold)" },
                                    }}
                                >
                                    {label}
                                </Typography>
                            ))}
                        </Stack>
                    </Box>
                    )}
                </Box>

                <Divider sx={{ my: 5 }} />
                <Button color="error" onClick={() => setConfirmDelete(true)}>
                    Delete this sermon
                </Button>

                <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                    <DialogTitle>Delete “{sermon.title}”?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            This cannot be undone, and the credits spent generating it are not refunded.
                            Export it to Word first if you might want it later.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                        <Button color="error" onClick={() => void remove()}>Delete</Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
}

/** The outline as something to read and preach from. */
function ReadView({ sermon }: { sermon: Sermon }) {
    return (
        <Box>
            <Typography variant="h2" sx={{ mt: 1.5, fontSize: { xs: "2.4rem", md: "3.2rem" }, lineHeight: 1.08 }}>
                {sermon.title}
            </Typography>

            {sermon.scripture.length > 0 && (
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mt: 2.5 }}>
                    <MenuBookOutlinedIcon sx={{ color: "var(--ink-2)", fontSize: 20 }} />
                    {sermon.scripture.map((ref) => (
                        <Chip key={ref} label={ref} sx={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)", fontWeight: 600 }} />
                    ))}
                </Stack>
            )}

            {sermon.bigIdea && (
                <Box
                    id="big-idea"
                    sx={{ mt: 4, p: { xs: 3, md: 4 }, borderRadius: 4, backgroundColor: "var(--gold-soft)", scrollMarginTop: 96 }}
                >
                    <Typography variant="overline" sx={{ color: "#7a5a1f" }}>
                        Big idea
                    </Typography>
                    <Typography className="serif" sx={{ mt: 0.5, fontSize: { xs: "1.6rem", md: "1.9rem" }, fontStyle: "italic", lineHeight: 1.3 }}>
                        {sermon.bigIdea}
                    </Typography>
                </Box>
            )}

            <Stack gap={5} sx={{ mt: 6 }}>
                {sermon.points.map((p, i) => (
                    <Box key={i} id={`point-${i + 1}`} sx={{ display: "flex", gap: { xs: 2, md: 3 }, scrollMarginTop: 96 }}>
                        <Typography
                            className="serif"
                            sx={{ fontSize: { xs: "2.6rem", md: "3.4rem" }, lineHeight: 0.9, color: "var(--gold)", fontStyle: "italic", minWidth: 36 }}
                        >
                            {i + 1}
                        </Typography>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h4" sx={{ fontSize: { xs: "1.6rem", md: "1.9rem" } }}>
                                {p.heading}
                            </Typography>
                            {p.verses.length > 0 && (
                                <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
                                    {p.verses.map((v) => (
                                        <Chip key={v} size="small" variant="outlined" label={v} />
                                    ))}
                                </Stack>
                            )}
                            <Typography sx={{ mt: 1.5, fontSize: "1.05rem", lineHeight: 1.75, color: "var(--ink)", maxWidth: "68ch" }}>
                                {p.body}
                            </Typography>
                        </Box>
                    </Box>
                ))}
            </Stack>

            {sermon.illustrations.length > 0 && (
                <ReadSection id="illustrations" title="Illustrations">
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                        {sermon.illustrations.map((t, i) => (
                            <Paper key={i} variant="outlined" sx={{ p: 2.5, borderRadius: 3, display: "flex", gap: 1.5 }}>
                                <LightbulbOutlinedIcon sx={{ color: "var(--gold)", mt: 0.25 }} />
                                <Typography sx={{ lineHeight: 1.65 }}>{t}</Typography>
                            </Paper>
                        ))}
                    </Box>
                </ReadSection>
            )}

            {sermon.application.length > 0 && (
                <ReadSection id="application" title="This week">
                    <Stack gap={1.5}>
                        {sermon.application.map((t, i) => (
                            <Stack key={i} direction="row" gap={1.5} alignItems="flex-start">
                                <CheckCircleOutlineIcon sx={{ color: "var(--brand)", mt: 0.25 }} />
                                <Typography sx={{ lineHeight: 1.65 }}>{t}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </ReadSection>
            )}

            {sermon.closingPrayer && (
                <Box
                    id="prayer"
                    sx={{ mt: 6, p: { xs: 3, md: 5 }, borderRadius: 4, backgroundColor: "var(--surface-muted)", textAlign: "center", scrollMarginTop: 96 }}
                >
                    <Typography variant="overline" sx={{ color: "var(--ink-2)" }}>
                        Closing prayer
                    </Typography>
                    <Typography className="serif" sx={{ mt: 1, fontSize: "1.4rem", fontStyle: "italic", lineHeight: 1.5, maxWidth: "56ch", mx: "auto" }}>
                        {sermon.closingPrayer}
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

function ReadSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <Box id={id} sx={{ mt: 6, scrollMarginTop: 96 }}>
            <Typography variant="h4" sx={{ fontSize: "1.9rem", mb: 2 }}>
                {title}
            </Typography>
            {children}
        </Box>
    );
}

/** The same outline as a form. */
function EditView({
    sermon,
    edit,
    editPoint,
}: {
    sermon: Sermon;
    edit: (patch: Partial<Sermon>) => void;
    editPoint: (index: number, patch: Partial<SermonPoint>) => void;
}) {
    return (
        <Box>
            <TextField
                fullWidth
                label="Title"
                value={sermon.title}
                onChange={(e) => edit({ title: e.target.value })}
                sx={{ mt: 3 }}
            />

            <Section title="Big idea" hint="The one sentence the congregation should remember.">
                <TextField fullWidth multiline minRows={2} value={sermon.bigIdea} onChange={(e) => edit({ bigIdea: e.target.value })} />
            </Section>

            <Section title="Scripture">
                <ListEditor
                    items={sermon.scripture}
                    addLabel="Add a passage"
                    placeholder="e.g. Philippians 4:4-9"
                    onChange={(scripture) => edit({ scripture })}
                />
            </Section>

            <Section title="Points">
                <Stack gap={2}>
                    {sermon.points.map((p, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="overline" sx={{ color: "var(--gold)" }}>
                                    Point {i + 1}
                                </Typography>
                                <IconButton
                                    size="small"
                                    aria-label={`Remove point ${i + 1}`}
                                    onClick={() => edit({ points: sermon.points.filter((_, j) => j !== i) })}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                            <Stack gap={1.5}>
                                <TextField
                                    fullWidth
                                    label="Heading"
                                    value={p.heading}
                                    onChange={(e) => editPoint(i, { heading: e.target.value })}
                                />
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    label="What to say"
                                    value={p.body}
                                    onChange={(e) => editPoint(i, { body: e.target.value })}
                                />
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Verses"
                                    helperText="Separate with commas"
                                    value={p.verses.join(", ")}
                                    onChange={(e) =>
                                        editPoint(i, { verses: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })
                                    }
                                />
                            </Stack>
                        </Paper>
                    ))}
                    <Button
                        startIcon={<AddIcon />}
                        onClick={() => edit({ points: [...sermon.points, { heading: "", body: "", verses: [] }] })}
                        sx={{ alignSelf: "flex-start", color: "var(--ink)" }}
                    >
                        Add a point
                    </Button>
                </Stack>
            </Section>

            <Section title="Illustrations">
                <ListEditor
                    items={sermon.illustrations}
                    addLabel="Add an illustration"
                    placeholder="A concrete story or image"
                    onChange={(illustrations) => edit({ illustrations })}
                />
            </Section>

            <Section title="This week" hint="Steps someone could take this week.">
                <ListEditor
                    items={sermon.application}
                    addLabel="Add a step"
                    placeholder="Something someone could do this week"
                    onChange={(application) => edit({ application })}
                />
            </Section>

            <Section title="Closing prayer">
                <TextField fullWidth multiline minRows={3} value={sermon.closingPrayer} onChange={(e) => edit({ closingPrayer: e.target.value })} />
            </Section>
        </Box>
    );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h6">{title}</Typography>
            {hint && (
                <Typography variant="body2" sx={{ color: "var(--ink-2)" }}>
                    {hint}
                </Typography>
            )}
            <Box sx={{ mt: 1.5 }}>{children}</Box>
        </Box>
    );
}

function ListEditor({
    items,
    addLabel,
    placeholder,
    onChange,
}: {
    items: string[];
    addLabel: string;
    placeholder: string;
    onChange: (next: string[]) => void;
}) {
    return (
        <Stack gap={1}>
            {items.map((item, i) => (
                <Stack key={i} direction="row" gap={1} alignItems="flex-start">
                    <TextField
                        fullWidth
                        size="small"
                        multiline
                        placeholder={placeholder}
                        value={item}
                        onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
                    />
                    <IconButton size="small" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ))}
            <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={() => onChange([...items, ""])}
                sx={{ alignSelf: "flex-start", color: "var(--ink)" }}
            >
                {addLabel}
            </Button>
        </Stack>
    );
}
