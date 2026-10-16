"use client";

import { useMemo, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { LIBRARY_CATEGORIES, STYLE_LIBRARY } from "@/lib/slideStyleLibrary";
import SlideView from "./SlideView";
import type { Slide, SlideStyle } from "@/lib/types";

/** The 100-style library, filterable by category, previewing this sermon's title slide. */
export default function StyleLibrary({
    sample,
    selectedId,
    onSelect,
}: {
    sample: Slide;
    selectedId: string | null;
    onSelect: (style: SlideStyle) => void;
}) {
    const [category, setCategory] = useState<string | null>(null);
    const styles = useMemo(
        () => (category ? STYLE_LIBRARY.filter((s) => s.category === category) : STYLE_LIBRARY),
        [category]
    );

    return (
        <Box>
            <Stack direction="row" gap={1} flexWrap="wrap">
                {[null, ...LIBRARY_CATEGORIES].map((c) => (
                    <Chip
                        key={c ?? "all"}
                        label={c ?? `All ${STYLE_LIBRARY.length}`}
                        onClick={() => setCategory(c)}
                        variant={category === c ? "filled" : "outlined"}
                        sx={category === c ? { backgroundColor: "var(--ink)", color: "#fff", "&:hover": { backgroundColor: "var(--ink-hover)" } } : undefined}
                    />
                ))}
            </Stack>

            <Box sx={{ mt: 3, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
                {styles.map((st) => {
                    const on = st.id === selectedId;
                    return (
                        <Box
                            key={st.id}
                            component="button"
                            onClick={() => onSelect(st)}
                            aria-pressed={on}
                            sx={{
                                p: 0,
                                border: 0,
                                textAlign: "left",
                                font: "inherit",
                                color: "inherit",
                                backgroundColor: "transparent",
                                cursor: "pointer",
                                "&:hover .thumb": { transform: "translateY(-2px)", boxShadow: "var(--shadow-md)" },
                            }}
                        >
                            <Box
                                className="thumb"
                                sx={{
                                    borderRadius: 2,
                                    overflow: "hidden",
                                    outline: on ? "3px solid var(--brand)" : "1px solid var(--border)",
                                    outlineOffset: on ? 2 : 0,
                                    transition: "transform .15s, box-shadow .15s",
                                }}
                            >
                                <SlideView slide={sample} style={st} />
                            </Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mt: 0.75 }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                        {st.name}
                                    </Typography>
                                    <Typography variant="caption" noWrap component="div" sx={{ color: "var(--ink-2)" }}>
                                        {st.category}
                                    </Typography>
                                </Box>
                                {on && <CheckCircleIcon sx={{ color: "var(--brand)", fontSize: 20, flexShrink: 0 }} />}
                            </Stack>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
