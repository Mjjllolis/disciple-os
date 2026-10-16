"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Container, Dialog, IconButton, Paper, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { api } from "@/lib/apiClient";
import { priceSlides } from "@/lib/modules";
import { SLIDE_FONTS_HREF } from "@/lib/slideStyles";
import { downloadPptx } from "@/lib/slidesPptx";
import ModuleGate from "@/app/components/ModuleGate";
import PageSkeleton from "@/app/components/PageSkeleton";
import SlideView from "@/app/components/SlideView";
import StyleLibrary from "@/app/components/StyleLibrary";
import StyleEditor from "@/app/components/StyleEditor";
import { STYLE_LIBRARY } from "@/lib/slideStyleLibrary";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import JobProgress from "@/app/components/JobProgress";
import { useJob } from "@/app/components/useJob";
import { useChurch } from "@/app/components/ChurchProvider";
import { useToast } from "@/app/components/Toast";
import type { Sermon, Slide, SlideStyle } from "@/lib/types";

export default function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <ModuleGate moduleId="sermon_builder">
            {/* Fonts the slide styles can use; React hoists this into <head>. */}
            <link rel="stylesheet" href={SLIDE_FONTS_HREF} />
            <SlidesInner id={use(params).id} />
        </ModuleGate>
    );
}

function SlidesInner({ id }: { id: string }) {
    const router = useRouter();
    const toast = useToast();
    const { church, reload } = useChurch();
    const deckJob = useJob<{ slideCount: number }>();

    const [sermon, setSermon] = useState<Sermon | null>(null);
    const [error, setError] = useState("");
    const [designing, setDesigning] = useState(false);
    const [picked, setPicked] = useState("");
    const [presenting, setPresenting] = useState<number | null>(null);
    const [exporting, setExporting] = useState(false);
    // Picking styles again after a deck exists ("New look") without losing it.
    const [restyling, setRestyling] = useState(false);
    const [tab, setTab] = useState<"sermon" | "library">("sermon");
    // A library style picked but not yet saved onto this sermon.
    const [libraryPick, setLibraryPick] = useState<SlideStyle | null>(null);
    const [editingStyle, setEditingStyle] = useState<SlideStyle | null>(null);
    const autoDesigned = useRef(false);

    const load = useCallback(async () => {
        try {
            const { sermon: s } = await api<{ sermon: Sermon }>(`/api/sermons/${id}`);
            setSermon(s);
            return s;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load this sermon.");
            return null;
        }
    }, [id]);

    const designStyles = useCallback(async () => {
        setDesigning(true);
        setError("");
        try {
            const { styles } = await api<{ styles: SlideStyle[] }>(`/api/sermons/${id}/slides/styles`, { json: {} });
            setSermon((s) => (s ? { ...s, slideStyles: styles } : s));
            setPicked(styles[0]?.id ?? "");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not design slide styles.");
        } finally {
            setDesigning(false);
        }
    }, [id]);

    // Arriving with no styles yet: design them straight away (free).
    useEffect(() => {
        void load().then((s) => {
            if (!s) return;
            setPicked(s.slides?.styleId ?? s.slideStyles?.[0]?.id ?? "");
            if (!s.slideStyles?.length && !autoDesigned.current) {
                autoDesigned.current = true;
                void designStyles();
            }
        });
    }, [load, designStyles]);

    /** Adds or updates a style on this sermon (library pick or new colours). Free. */
    const saveStyle = async (style: SlideStyle): Promise<SlideStyle> => {
        const res = await api<{ style: SlideStyle; styles: SlideStyle[] }>(`/api/sermons/${id}/slides/styles`, {
            method: "PUT",
            json: { style },
        });
        setSermon((s) => (s ? { ...s, slideStyles: res.styles } : s));
        return res.style;
    };

    /** The picked style's id once it's on the sermon (library picks get saved first). */
    const ensurePicked = async (): Promise<string> => {
        const onSermon = sermon?.slideStyles?.some((st) => st.id === picked);
        if (!onSermon && libraryPick?.id === picked) {
            await saveStyle(libraryPick);
            setLibraryPick(null);
        }
        return picked;
    };

    /** With a deck already made: restyle it with the picked style, no rewrite. */
    const applyStyle = async () => {
        try {
            const styleId = await ensurePicked();
            await api(`/api/sermons/${id}/slides`, { method: "PATCH", json: { styleId } });
            setSermon((s) => (s?.slides ? { ...s, slides: { ...s.slides, styleId } } : s));
            setRestyling(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not apply that style.");
        }
    };

    const generate = async () => {
        let styleId: string;
        try {
            styleId = await ensurePicked();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not use that style.");
            return;
        }
        const result = await deckJob.start(`/api/sermons/${id}/slides`, { styleId });
        if (result) {
            toast.success(`${result.slideCount} slides are ready.`);
            setRestyling(false);
            void reload();
            await load();
        }
    };

    const switchStyle = async (styleId: string) => {
        if (!sermon?.slides) return;
        setSermon({ ...sermon, slides: { ...sermon.slides, styleId } });
        try {
            await api(`/api/sermons/${id}/slides`, { method: "PATCH", json: { styleId } });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not switch the style.");
        }
    };

    if (!sermon) {
        return error ? (
            <Container maxWidth="md" sx={{ py: 6 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        ) : (
            <PageSkeleton />
        );
    }

    const styles = sermon.slideStyles ?? [];
    const deck = sermon.slides;
    const deckStyle = styles.find((s) => s.id === deck?.styleId) ?? styles[0];
    const price = priceSlides(church);
    const showPicker = !deck || restyling;
    const pickedStyle = styles.find((st) => st.id === picked) ?? (libraryPick?.id === picked ? libraryPick : null);

    // Two sample slides from this sermon, so each thumbnail previews the real content.
    const samples: Slide[] = [
        { kind: "title", heading: sermon.title, body: sermon.scripture[0] ?? "" },
        { kind: "point", number: 1, heading: sermon.points[0]?.heading ?? "Point one" },
    ];

    return (
        <Box sx={{ py: { xs: 4, md: 6 } }}>
            <Container maxWidth="lg">
                <Button onClick={() => router.push(`/dashboard/sermons/${id}`)} sx={{ color: "var(--ink-2)", mb: 2, ml: -1 }}>
                    ← {sermon.title}
                </Button>

                {showPicker ? (
                    <>
                        <Typography variant="overline" sx={{ color: "var(--gold)", display: "block" }}>
                            Slides · step 1 of 2
                        </Typography>
                        <Typography variant="h3" sx={{ fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
                            Choose a look
                        </Typography>
                        <Typography sx={{ mt: 0.5, color: "var(--ink-2)" }}>
                            Styles designed for this sermon, or any of 100 in the library. Every one can be recoloured, and
                            switching later is free.
                        </Typography>

                        {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

                        <Stack direction="row" sx={{ mt: 3, p: 0.5, gap: 0.5, borderRadius: 99, backgroundColor: "var(--surface-muted)", width: "fit-content" }}>
                            {(
                                [
                                    ["sermon", "For this sermon"],
                                    ["library", `Library · ${STYLE_LIBRARY.length}`],
                                ] as const
                            ).map(([value, label]) => (
                                <Button
                                    key={value}
                                    size="small"
                                    onClick={() => setTab(value)}
                                    sx={{
                                        px: 2,
                                        color: tab === value ? "var(--ink)" : "var(--ink-2)",
                                        backgroundColor: tab === value ? "var(--surface)" : "transparent",
                                        boxShadow: tab === value ? "var(--shadow-sm)" : "none",
                                    }}
                                >
                                    {label}
                                </Button>
                            ))}
                        </Stack>

                        {tab === "library" ? (
                            <Box sx={{ mt: 3 }}>
                                <StyleLibrary
                                    sample={samples[0]}
                                    selectedId={picked}
                                    onSelect={(st) => {
                                        setLibraryPick(st);
                                        setPicked(st.id);
                                    }}
                                />
                            </Box>
                        ) : (
                        <Box sx={{ mt: 3, display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
                            {designing || !styles.length
                                ? [0, 1, 2].map((i) => (
                                      <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 4 }}>
                                          <Box sx={{ aspectRatio: "16 / 9", borderRadius: 2, backgroundColor: "var(--surface-muted)" }} />
                                          <Typography variant="body2" sx={{ mt: 1.5, color: "var(--ink-2)" }}>
                                              {designing ? "Designing…" : "No styles yet"}
                                          </Typography>
                                      </Paper>
                                  ))
                                : styles.map((st) => {
                                      const on = picked === st.id;
                                      return (
                                          <Paper
                                              key={st.id}
                                              variant="outlined"
                                              component="button"
                                              onClick={() => setPicked(st.id)}
                                              aria-pressed={on}
                                              sx={{
                                                  p: 1.5,
                                                  borderRadius: 4,
                                                  textAlign: "left",
                                                  font: "inherit",
                                                  color: "inherit",
                                                  cursor: "pointer",
                                                  borderWidth: 2,
                                                  borderColor: on ? "var(--brand)" : "transparent",
                                                  outline: on ? "none" : "1px solid var(--border)",
                                                  transition: "box-shadow .2s",
                                                  "&:hover": { boxShadow: "var(--shadow-md)" },
                                              }}
                                          >
                                              <Box sx={{ borderRadius: 2, overflow: "hidden" }}>
                                                  <SlideView slide={samples[0]} style={st} />
                                              </Box>
                                              <Box sx={{ mt: 1, width: "48%", borderRadius: 1.5, overflow: "hidden" }}>
                                                  <SlideView slide={samples[1]} style={st} index={1} />
                                              </Box>
                                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                                                  <Box>
                                                      <Typography sx={{ fontWeight: 600 }}>{st.name}</Typography>
                                                      <Typography variant="body2" sx={{ color: "var(--ink-2)" }}>
                                                          {st.mood}
                                                      </Typography>
                                                  </Box>
                                                  {on && <CheckCircleIcon sx={{ color: "var(--brand)" }} />}
                                              </Stack>
                                          </Paper>
                                      );
                                  })}
                        </Box>
                        )}

                        <JobProgress job={deckJob.job} running={deckJob.running} />
                        {deckJob.error && <Alert severity="error" sx={{ mt: 2 }}>{deckJob.error}</Alert>}

                        <Stack
                            direction="row"
                            gap={1.5}
                            flexWrap="wrap"
                            sx={{ mt: 4, position: "sticky", bottom: 16, zIndex: 2, p: 1.5, mx: -1.5, borderRadius: 99, backgroundColor: "rgba(250,248,245,.92)", backdropFilter: "blur(8px)" }}
                        >
                            {deck && restyling ? (
                                <>
                                    <Button variant="contained" size="large" disabled={!pickedStyle || deckJob.running} onClick={() => void applyStyle()}>
                                        Use this style (free)
                                    </Button>
                                    <Button variant="outlined" size="large" disabled={!pickedStyle || deckJob.running} onClick={() => void generate()} sx={{ color: "var(--ink)" }}>
                                        {deckJob.running ? "Rewriting…" : `Rewrite slides — ${price} credits`}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="contained"
                                    size="large"
                                    disabled={!pickedStyle || designing || deckJob.running}
                                    onClick={() => void generate()}
                                >
                                    {deckJob.running ? "Making slides…" : `Generate slides — ${price} credits`}
                                </Button>
                            )}
                            <Button
                                startIcon={<PaletteOutlinedIcon />}
                                disabled={!pickedStyle}
                                onClick={() => pickedStyle && setEditingStyle(pickedStyle)}
                                sx={{ color: "var(--ink)" }}
                            >
                                Customize colours
                            </Button>
                            <Button
                                startIcon={<RefreshIcon />}
                                disabled={designing || deckJob.running}
                                onClick={() => void designStyles()}
                                sx={{ color: "var(--ink)" }}
                            >
                                Different styles (free)
                            </Button>
                            {deck && (
                                <Button onClick={() => setRestyling(false)} sx={{ color: "var(--ink-2)" }}>
                                    Back to my slides
                                </Button>
                            )}
                        </Stack>
                    </>
                ) : (
                    deckStyle && (
                        <>
                            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ md: "flex-end" }}>
                                <Box>
                                    <Typography variant="overline" sx={{ color: "var(--gold)" }}>
                                        Slides · {deck.slides.length}
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
                                        {sermon.title}
                                    </Typography>
                                </Box>
                                <Stack direction="row" gap={1} flexWrap="wrap">
                                    <Button variant="contained" startIcon={<SlideshowIcon />} onClick={() => setPresenting(0)}>
                                        Present
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                        disabled={exporting}
                                        onClick={async () => {
                                            setExporting(true);
                                            try {
                                                await downloadPptx(sermon.title, deck.slides, deckStyle);
                                            } finally {
                                                setExporting(false);
                                            }
                                        }}
                                        sx={{ color: "var(--ink)", backgroundColor: "var(--surface)" }}
                                    >
                                        {exporting ? "Preparing…" : "PowerPoint"}
                                    </Button>
                                </Stack>
                            </Stack>

                            {/* Style switcher: free, it only changes how the same slides are drawn. */}
                            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap" sx={{ mt: 3 }}>
                                <Typography variant="body2" sx={{ color: "var(--ink-2)", mr: 0.5 }}>
                                    Style
                                </Typography>
                                {styles.map((st) => {
                                    const on = st.id === deckStyle.id;
                                    return (
                                        <Box
                                            key={st.id}
                                            component="button"
                                            onClick={() => void switchStyle(st.id)}
                                            aria-pressed={on}
                                            title={st.name}
                                            sx={{
                                                width: 96,
                                                p: 0,
                                                borderRadius: 1.5,
                                                overflow: "hidden",
                                                cursor: "pointer",
                                                border: "2px solid",
                                                borderColor: on ? "var(--brand)" : "var(--border)",
                                                backgroundColor: "transparent",
                                            }}
                                        >
                                            <SlideView slide={samples[0]} style={st} />
                                        </Box>
                                    );
                                })}
                                <Button size="small" startIcon={<PaletteOutlinedIcon />} onClick={() => setEditingStyle(deckStyle)} sx={{ color: "var(--ink)" }}>
                                    Customize colours
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setPicked(deckStyle.id);
                                        setTab("library");
                                        setRestyling(true);
                                    }}
                                    sx={{ color: "var(--ink)" }}
                                >
                                    Browse library
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setPicked(deckStyle.id);
                                        setTab("sermon");
                                        setRestyling(true);
                                    }}
                                    sx={{ color: "var(--ink-2)" }}
                                >
                                    New styles or rewrite…
                                </Button>
                            </Stack>

                            <Box sx={{ mt: 4, display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" } }}>
                                {deck.slides.map((slide, i) => (
                                    <Box key={i}>
                                        <Box
                                            component="button"
                                            onClick={() => setPresenting(i)}
                                            aria-label={`Present from slide ${i + 1}`}
                                            sx={{
                                                display: "block",
                                                width: "100%",
                                                p: 0,
                                                border: "1px solid var(--border)",
                                                borderRadius: 2,
                                                overflow: "hidden",
                                                cursor: "pointer",
                                                backgroundColor: "transparent",
                                                transition: "box-shadow .2s, transform .2s",
                                                "&:hover": { boxShadow: "var(--shadow-md)", transform: "translateY(-1px)" },
                                            }}
                                        >
                                            <SlideView slide={slide} style={deckStyle} index={i} />
                                        </Box>
                                        <Typography variant="caption" sx={{ color: "var(--ink-2)" }}>
                                            {i + 1}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>

                            <Presenter
                                slides={deck.slides}
                                style={deckStyle}
                                index={presenting}
                                onChange={setPresenting}
                            />
                        </>
                    )
                )}
                <StyleEditor
                    style={editingStyle}
                    samples={samples}
                    onClose={() => setEditingStyle(null)}
                    onSave={async (draft) => {
                        try {
                            const saved = await saveStyle(draft);
                            if (libraryPick?.id === saved.id) setLibraryPick(null);
                            setPicked(saved.id);
                            setEditingStyle(null);
                            toast.success("Colours saved.");
                        } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Could not save those colours.");
                        }
                    }}
                />
            </Container>
        </Box>
    );
}

/** Full-screen slideshow: arrows or space to move, Esc to leave. */
function Presenter({
    slides,
    style,
    index,
    onChange,
}: {
    slides: Slide[];
    style: SlideStyle;
    index: number | null;
    onChange: (i: number | null) => void;
}) {
    useEffect(() => {
        if (index === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(e.key)) onChange(Math.min(slides.length - 1, index + 1));
            if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) onChange(Math.max(0, index - 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [index, slides.length, onChange]);

    return (
        <Dialog fullScreen open={index !== null} onClose={() => onChange(null)} slotProps={{ paper: { sx: { backgroundColor: "#000" } } }}>
            {index !== null && (
                <Box sx={{ position: "relative", width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                    <Box sx={{ width: "min(100vw, calc(100vh * 16 / 9))" }}>
                        <SlideView slide={slides[index]} style={style} index={index} />
                    </Box>
                    <IconButton onClick={() => onChange(null)} aria-label="Exit" sx={{ position: "absolute", top: 16, right: 16, color: "rgba(255,255,255,.7)" }}>
                        <CloseIcon />
                    </IconButton>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ position: "absolute", bottom: 16, right: 16, color: "rgba(255,255,255,.7)" }}>
                        <IconButton disabled={index === 0} onClick={() => onChange(index - 1)} aria-label="Previous" sx={{ color: "inherit" }}>
                            <ChevronLeftIcon />
                        </IconButton>
                        <Typography variant="body2">
                            {index + 1} / {slides.length}
                        </Typography>
                        <IconButton disabled={index === slides.length - 1} onClick={() => onChange(index + 1)} aria-label="Next" sx={{ color: "inherit" }}>
                            <ChevronRightIcon />
                        </IconButton>
                    </Stack>
                </Box>
            )}
        </Dialog>
    );
}
