"use client";

import { Box } from "@mui/material";
import { SLIDE_FONTS, withDefaults } from "@/lib/slideStyles";
import { slideBackgroundUrl, SPLIT_PANEL } from "@/lib/slideArt";
import type { Slide, SlideStyle } from "@/lib/types";

/**
 * One 16:9 slide drawn in a style. Sizes are in container-width units (cqw),
 * so the same slide renders identically as a thumbnail or full screen.
 */
export default function SlideView({ slide, style: raw, index = 0 }: { slide: Slide; style: SlideStyle; index?: number }) {
    const style = withDefaults(raw);
    const heading = SLIDE_FONTS[style.headingFont];
    const bodyFont = SLIDE_FONTS[style.bodyFont];
    const centered = style.layout === "centered";
    const split = style.motif === "split";
    // Upper-case headings get tracking so they don't feel cramped.
    const caseSx = style.headingCase === "upper" ? { textTransform: "uppercase" as const, letterSpacing: "0.06em" } : {};

    const rule = (
        <Box sx={{ width: "7cqw", height: "0.45cqw", backgroundColor: style.accent, borderRadius: 99, my: "2cqw", mx: centered ? "auto" : 0 }} />
    );
    const label = (text: string) => (
        <Box sx={{ fontFamily: bodyFont, fontSize: "1.6cqw", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: style.accent }}>
            {text}
        </Box>
    );

    let content: React.ReactNode;
    switch (slide.kind) {
        case "title":
            content = (
                <>
                    <Box sx={{ fontFamily: heading, fontSize: style.headingCase === "upper" ? "5.4cqw" : "6.4cqw", fontWeight: 600, lineHeight: 1.08, ...caseSx }}>{slide.heading}</Box>
                    {rule}
                    {slide.body && <Box sx={{ fontFamily: bodyFont, fontSize: "2.3cqw", color: style.muted }}>{slide.body}</Box>}
                </>
            );
            break;
        case "big_idea":
            content = (
                <>
                    {label("The big idea")}
                    <Box sx={{ mt: "2.2cqw", fontFamily: heading, fontSize: "4.6cqw", fontWeight: 500, lineHeight: 1.2, fontStyle: "italic" }}>
                        {slide.body}
                    </Box>
                </>
            );
            break;
        case "scripture":
            content = (
                <>
                    <Box sx={{ fontFamily: heading, fontSize: "3.5cqw", fontStyle: "italic", lineHeight: 1.35 }}>
                        &ldquo;{slide.body}&rdquo;
                    </Box>
                    {rule}
                    {slide.reference && label(slide.reference)}
                </>
            );
            break;
        case "point":
            content = (
                <>
                    <Box sx={{ fontFamily: heading, fontSize: "9cqw", lineHeight: 1, color: style.accent, fontStyle: "italic" }}>
                        {slide.number ?? ""}
                    </Box>
                    <Box sx={{ mt: "1.5cqw", fontFamily: heading, fontSize: style.headingCase === "upper" ? "4.2cqw" : "5cqw", fontWeight: 600, lineHeight: 1.12, ...caseSx }}>{slide.heading}</Box>
                    {slide.body && (
                        <Box sx={{ mt: "2cqw", fontFamily: bodyFont, fontSize: "2.4cqw", color: style.muted, lineHeight: 1.4 }}>{slide.body}</Box>
                    )}
                </>
            );
            break;
        case "list":
            content = (
                <>
                    <Box sx={{ fontFamily: heading, fontSize: "4.6cqw", fontWeight: 600, ...caseSx }}>{slide.heading}</Box>
                    {rule}
                    <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "inline-flex", flexDirection: "column", gap: "1.6cqw", textAlign: "left" }}>
                        {(slide.bullets ?? []).map((b, i) => (
                            <Box component="li" key={i} sx={{ display: "flex", gap: "1.6cqw", alignItems: "baseline", fontFamily: bodyFont, fontSize: "2.6cqw", lineHeight: 1.3 }}>
                                <Box component="span" sx={{ width: "1cqw", height: "1cqw", borderRadius: 99, backgroundColor: style.accent, flexShrink: 0, transform: "translateY(-0.2cqw)" }} />
                                {b}
                            </Box>
                        ))}
                    </Box>
                </>
            );
            break;
        case "closing":
            content = (
                <>
                    <Box sx={{ fontFamily: heading, fontSize: "4.6cqw", fontWeight: 600, ...caseSx }}>{slide.heading}</Box>
                    {rule}
                    {slide.body && (
                        <Box sx={{ fontFamily: heading, fontSize: "2.8cqw", fontStyle: "italic", color: style.muted, lineHeight: 1.45 }}>{slide.body}</Box>
                    )}
                </>
            );
            break;
        default:
            content = <Box sx={{ fontFamily: heading, fontSize: "5.2cqw", fontWeight: 500, lineHeight: 1.2 }}>{slide.body ?? slide.heading}</Box>;
    }

    return (
        <Box sx={{ containerType: "inline-size", width: "100%" }}>
            <Box
                sx={{
                    aspectRatio: "16 / 9",
                    // Gradient, motif and grain in one SVG, shared with the PowerPoint export.
                    backgroundImage: slideBackgroundUrl(style, index % 2),
                    backgroundSize: "cover",
                    backgroundColor: style.background,
                    color: style.text,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: centered ? "center" : "flex-start",
                    textAlign: centered ? "center" : "left",
                    pl: split ? `${SPLIT_PANEL * 100 + 6}cqw` : centered ? "9cqw" : "8cqw",
                    pr: centered ? "9cqw" : "8cqw",
                    overflow: "hidden",
                }}
            >
                <Box sx={{ maxWidth: split ? "52cqw" : centered ? "80cqw" : "70cqw" }}>{content}</Box>
            </Box>
        </Box>
    );
}
