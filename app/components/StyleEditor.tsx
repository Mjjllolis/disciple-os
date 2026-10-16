"use client";

import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    Switch,
    Typography,
} from "@mui/material";
import { withDefaults } from "@/lib/slideStyles";
import SlideView from "./SlideView";
import type { Slide, SlideStyle } from "@/lib/types";

const COLOURS: { key: keyof Pick<SlideStyle, "background" | "backgroundEnd" | "text" | "muted" | "accent" | "accent2">; label: string }[] = [
    { key: "background", label: "Background" },
    { key: "backgroundEnd", label: "Gradient end" },
    { key: "text", label: "Text" },
    { key: "muted", label: "Secondary text" },
    { key: "accent", label: "Accent" },
    { key: "accent2", label: "Artwork glow" },
];

/**
 * Recolour a style with a live preview. Saving re-checks contrast on the
 * server, so unreadable text colours are corrected rather than shipped.
 */
export default function StyleEditor({
    style,
    samples,
    onClose,
    onSave,
}: {
    style: SlideStyle | null;
    samples: Slide[];
    onClose: () => void;
    onSave: (style: SlideStyle) => Promise<void>;
}) {
    const [draft, setDraft] = useState<SlideStyle | null>(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => setDraft(style ? withDefaults(style) : null), [style]);

    const set = (patch: Partial<SlideStyle>) => setDraft((d) => (d ? { ...d, ...patch } : d));

    return (
        <Dialog open={Boolean(style)} onClose={onClose} fullWidth maxWidth="md">
            {draft && (
                <>
                    <DialogTitle>Customize “{draft.name}”</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" }, alignItems: "start" }}>
                            <Stack gap={1.5}>
                                {samples.map((s, i) => (
                                    <Box key={i} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid var(--border)" }}>
                                        <SlideView slide={s} style={draft} index={i} />
                                    </Box>
                                ))}
                            </Stack>
                            <Stack gap={1.25}>
                                {COLOURS.map(({ key, label }) => (
                                    <Stack
                                        key={key}
                                        component="label"
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        sx={{ px: 1.5, py: 1, borderRadius: 2, border: "1px solid var(--border)", cursor: "pointer" }}
                                    >
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {label}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "var(--ink-2)", fontFamily: "monospace" }}>
                                                {draft[key]}
                                            </Typography>
                                        </Box>
                                        <Box
                                            component="input"
                                            type="color"
                                            value={draft[key]}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ [key]: e.target.value })}
                                            sx={{ width: 40, height: 32, p: 0, border: "1px solid var(--border)", borderRadius: 1.5, background: "none", cursor: "pointer" }}
                                        />
                                    </Stack>
                                ))}
                                <FormControlLabel
                                    control={<Switch checked={draft.headingCase === "upper"} onChange={(e) => set({ headingCase: e.target.checked ? "upper" : "normal" })} />}
                                    label="Uppercase headings"
                                />
                                <FormControlLabel
                                    control={<Switch checked={draft.texture} onChange={(e) => set({ texture: e.target.checked })} />}
                                    label="Film grain"
                                />
                            </Stack>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDraft(style ? withDefaults(style) : null)} sx={{ color: "var(--ink-2)", mr: "auto" }}>
                            Reset
                        </Button>
                        <Button onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            disabled={saving}
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await onSave(draft);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            {saving ? "Saving…" : "Save colours"}
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
}
