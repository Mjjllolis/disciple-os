import { SLIDE_MOTIFS } from "./slideArt";
import type { SlideFont, SlideMotif, SlideStyle } from "./types";

/** CSS stacks for the fonts a style may pick. All load from Google Fonts on the slides page. */
export const SLIDE_FONTS: Record<SlideFont, string> = {
    "Cormorant Garamond": "'Cormorant Garamond', Georgia, serif",
    "Playfair Display": "'Playfair Display', Georgia, serif",
    Lora: "'Lora', Georgia, serif",
    Inter: "'Inter', system-ui, sans-serif",
    Montserrat: "'Montserrat', system-ui, sans-serif",
    Oswald: "'Oswald', 'Arial Narrow', sans-serif",
};

export const SLIDE_FONTS_HREF =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500&family=Playfair+Display:wght@500;700" +
    "&family=Lora:wght@400;600&family=Inter:wght@400;600&family=Montserrat:wght@400;600;700&family=Oswald:wght@400;600&display=swap";

const HEX = /^#[0-9a-f]{6}$/i;

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** Readable ink for a background: the model's choice if it passes, else near-white or near-black. */
function readable(preferred: string, ...backgrounds: string[]): string {
    if (HEX.test(preferred) && backgrounds.every((bg) => contrast(preferred, bg) >= 4.5)) return preferred;
    return backgrounds.every((bg) => contrast("#fbf8f3", bg) >= contrast("#1b1714", bg)) ? "#fbf8f3" : "#1b1714";
}

/**
 * Turns whatever the model proposed into a style that is safe to render:
 * valid colours, known fonts, and text that meets contrast on both gradient stops.
 */
export function sanitizeStyle(raw: Partial<SlideStyle>, index: number): SlideStyle {
    const font = (f: unknown, fallback: SlideFont): SlideFont =>
        typeof f === "string" && f in SLIDE_FONTS ? (f as SlideFont) : fallback;
    const background = HEX.test(raw.background ?? "") ? raw.background! : "#1f2a44";
    const backgroundEnd = HEX.test(raw.backgroundEnd ?? "") ? raw.backgroundEnd! : background;
    const text = readable(raw.text ?? "", background, backgroundEnd);
    return {
        id: `style-${index + 1}`,
        name: String(raw.name ?? `Style ${index + 1}`).slice(0, 40),
        mood: String(raw.mood ?? "").slice(0, 120),
        background,
        backgroundEnd,
        text,
        // Secondary text and the accent only need to read as large type (3:1).
        muted: HEX.test(raw.muted ?? "") && contrast(raw.muted!, background) >= 3 ? raw.muted! : text,
        accent: HEX.test(raw.accent ?? "") && contrast(raw.accent!, background) >= 3 ? raw.accent! : text,
        // Decorative only, so no contrast floor; falls back to the accent.
        accent2: HEX.test(raw.accent2 ?? "") ? raw.accent2! : HEX.test(raw.accent ?? "") ? raw.accent! : text,
        headingFont: font(raw.headingFont, "Playfair Display"),
        bodyFont: font(raw.bodyFont, "Inter"),
        // The split panel sits on the left, so its text always starts beside it.
        layout: raw.layout === "left" || raw.motif === "split" ? "left" : "centered",
        motif: SLIDE_MOTIFS.includes(raw.motif as SlideMotif) ? (raw.motif as SlideMotif) : SLIDE_MOTIFS[index % SLIDE_MOTIFS.length],
        texture: Boolean(raw.texture),
        headingCase: raw.headingCase === "upper" ? "upper" : "normal",
    };
}

/** Fills fields that styles saved before motifs existed don't have. */
export function withDefaults(style: SlideStyle): SlideStyle {
    return {
        ...style,
        accent2: style.accent2 ?? style.accent,
        motif: style.motif ?? "none",
        texture: style.texture ?? false,
        headingCase: style.headingCase ?? "normal",
    };
}
