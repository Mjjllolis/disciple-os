"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardActions,
    CardMedia,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { api } from "@/lib/apiClient";
import { priceImages } from "@/lib/modules";
import { useJob } from "@/app/components/useJob";
import JobProgress from "@/app/components/JobProgress";
import ModuleGate from "@/app/components/ModuleGate";
import { useChurch } from "@/app/components/ChurchProvider";
import { useToast } from "@/app/components/Toast";
import type { GeneratedImage, ImagePurpose } from "@/lib/types";
import PageSkeleton from "@/app/components/PageSkeleton";

const PURPOSES: { value: ImagePurpose; label: string; hint: string }[] = [
    { value: "series_art", label: "Series art", hint: "Square. Space left in the middle for a title." },
    { value: "sermon_slide", label: "Sermon slide", hint: "Wide. Dimmed centre so white text reads on top." },
    { value: "social_post", label: "Social post", hint: "Square. Built to read at thumbnail size." },
    { value: "flyer", label: "Flyer / story", hint: "Tall. Lower third kept quiet for event details." },
];

export default function ImagesPage() {
    return (
        <ModuleGate moduleId="image_studio">
            <ImagesInner />
        </ModuleGate>
    );
}

function ImagesInner() {
    const toast = useToast();
    const { reload, church } = useChurch();
    const job = useJob<{ imageId: string; url: string }>();

    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [styleNote, setStyleNote] = useState("");
    const [purpose, setPurpose] = useState<ImagePurpose>("series_art");
    const [preview, setPreview] = useState<GeneratedImage | null>(null);

    const load = useCallback(async () => {
        try {
            const data = await api<{ images: GeneratedImage[] }>("/api/images");
            setImages(data.images);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load your images.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const generate = async () => {
        const result = await job.start("/api/images/generate", { prompt, styleNote, purpose });
        if (result?.imageId) {
            setOpen(false);
            setPrompt("");
            toast.success("Image ready.");
            void reload();
            await load();
        }
    };

    const remove = async (image: GeneratedImage) => {
        try {
            await api(`/api/images/${image.id}`, { method: "DELETE" });
            setImages((list) => list.filter((i) => i.id !== image.id));
            setPreview(null);
            toast.success("Image deleted.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete that image.");
        }
    };

    if (loading) {
        return (
            <PageSkeleton />
        );
    }

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "var(--light-cream)", py: 5 }}>
            <Container maxWidth="lg">
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} alignItems={{ sm: "center" }}>
                    <Box>
                        <Typography variant="h4" sx={{ color: "var(--deep-brown)", fontWeight: 700 }}>
                            Image Studio
                        </Typography>
                        <Typography sx={{ color: "var(--dark-gray)" }}>
                            Series art, slide backgrounds, and social graphics.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => setOpen(true)}
                        sx={{ backgroundColor: "var(--muted-blue)", "&:hover": { backgroundColor: "var(--brand-hover)" } }}
                    >
                        New image
                    </Button>
                </Stack>

                {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

                <Alert severity="info" sx={{ mt: 3 }}>
                    Images are generated without any lettering on purpose — models misspell text. Add your
                    title in Canva, Keynote, or ProPresenter over the top.
                </Alert>

                {images.length === 0 ? (
                    <Paper elevation={0} sx={{ mt: 4, p: 6, borderRadius: 3, textAlign: "center", border: "1px dashed var(--soft-beige)" }}>
                        <Typography sx={{ color: "var(--dark-gray)" }}>
                            No images yet. Describe the feel you want and generate your first one.
                        </Typography>
                    </Paper>
                ) : (
                    <Box
                        sx={{
                            mt: 4,
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                        }}
                    >
                        {images.map((image) => (
                            <Card key={image.id} elevation={0} sx={{ borderRadius: 3, border: "1px solid var(--soft-beige)", overflow: "hidden" }}>
                                <CardMedia
                                    component="img"
                                    image={image.url}
                                    alt={image.prompt}
                                    onClick={() => setPreview(image)}
                                    sx={{ cursor: "zoom-in", aspectRatio: "1 / 1", objectFit: "cover" }}
                                />
                                <Box sx={{ p: 1.5 }}>
                                    <Chip size="small" label={PURPOSES.find((p) => p.value === image.purpose)?.label ?? image.purpose} />
                                    <Typography variant="body2" sx={{ color: "var(--dark-gray)", mt: 1 }}>
                                        {image.prompt.length > 90 ? `${image.prompt.slice(0, 90)}…` : image.prompt}
                                    </Typography>
                                </Box>
                                <CardActions>
                                    <Button
                                        size="small"
                                        startIcon={<DownloadIcon />}
                                        component="a"
                                        href={image.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        sx={{ color: "var(--deep-brown)" }}
                                    >
                                        Open
                                    </Button>
                                    <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => void remove(image)}>
                                        Delete
                                    </Button>
                                </CardActions>
                            </Card>
                        ))}
                    </Box>
                )}

                <Dialog open={open} onClose={() => !job.running && setOpen(false)} fullWidth maxWidth="sm">
                    <DialogTitle>New image</DialogTitle>
                    <DialogContent>
                        <Stack gap={2} sx={{ mt: 1 }}>
                            <TextField select label="What is it for?" value={purpose} onChange={(e) => setPurpose(e.target.value as ImagePurpose)}>
                                {PURPOSES.map((p) => (
                                    <MenuItem key={p.value} value={p.value}>{p.label} — {p.hint}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Describe the image"
                                multiline
                                minRows={3}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="A quiet sunrise over still water, warm light breaking through low mist"
                            />
                            <TextField
                                label="Style (optional)"
                                value={styleNote}
                                onChange={(e) => setStyleNote(e.target.value)}
                                placeholder="e.g. film photography, muted earth tones"
                            />
                            <JobProgress job={job.job} running={job.running} />
                            {job.error && <Alert severity="error">{job.error}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={job.running} onClick={() => setOpen(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            disabled={job.running || !prompt.trim()}
                            onClick={() => void generate()}
                            sx={{ backgroundColor: "var(--muted-blue)" }}
                        >
                            {job.running ? "Generating…" : `Generate — ${priceImages(1, church)} credits`}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="md">
                    {preview && (
                        <>
                            <DialogContent sx={{ p: 0 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preview.url} alt={preview.prompt} style={{ width: "100%", display: "block" }} />
                            </DialogContent>
                            <DialogActions sx={{ px: 3, pb: 2 }}>
                                <Typography variant="body2" sx={{ color: "var(--dark-gray)", flexGrow: 1 }}>
                                    {preview.size}
                                </Typography>
                                <Button component="a" href={preview.url} target="_blank" rel="noreferrer">Open full size</Button>
                                <Button onClick={() => setPreview(null)}>Close</Button>
                            </DialogActions>
                        </>
                    )}
                </Dialog>
            </Container>
        </Box>
    );
}
