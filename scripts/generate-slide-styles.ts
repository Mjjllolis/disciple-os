/**
 * Builds the slide style library (lib/slideStyleLibrary.json) with Claude:
 * ten themed batches of ten, so the 100 styles cover a real range.
 *
 *   npx tsx --env-file=.env.local scripts/generate-slide-styles.ts
 *
 * Re-running replaces the library. Every style passes through sanitizeStyle,
 * so colours, fonts and text contrast are always valid.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { generateJson } from "../lib/ai";
import { SLIDE_MOTIFS } from "../lib/slideArt";
import { SLIDE_FONTS, sanitizeStyle } from "../lib/slideStyles";
import type { SlideStyle } from "../lib/types";

const CATEGORIES: { name: string; brief: string }[] = [
    { name: "Classic & Reverent", brief: "deep, dignified, cathedral and candlelight; serif headings" },
    { name: "Light & Airy", brief: "pale, bright, calm backgrounds with dark text; gentle accents" },
    { name: "Bold & Modern", brief: "high-contrast, graphic, confident; sans-serif and uppercase welcome" },
    { name: "Warm & Earthy", brief: "terracotta, clay, olive, wheat, warm browns" },
    { name: "Jewel Tones", brief: "emerald, sapphire, amethyst, ruby, gold" },
    { name: "Minimal", brief: "restrained, near-monochrome, lots of space, a single accent" },
    { name: "Advent & Christmas", brief: "midnight blues, evergreen, candle gold, starlight, crimson" },
    { name: "Lent & Easter", brief: "purple and ash for Lent, sunrise gold and white for Easter morning" },
    { name: "Youth & Vibrant", brief: "energetic, saturated, playful but still legible" },
    { name: "Nature & Creation", brief: "sky, sea, forest, desert, mountains, dawn and dusk" },
];

const FONT_LIST = Object.keys(SLIDE_FONTS).join(", ");
const MOTIF_LIST = SLIDE_MOTIFS.join(", ");

async function batch(category: { name: string; brief: string }): Promise<(SlideStyle & { category: string })[]> {
    const res = await generateJson<{ styles?: Partial<SlideStyle>[] }>({
        effort: "low",
        maxTokens: 8000,
        system:
            "You are an award-winning church presentation designer. Every style you make is distinctive and " +
            "legible from the back row of a sanctuary.",
        prompt:
            `Design 10 clearly different slide styles for the category "${category.name}": ${category.brief}.\n` +
            `Use every motif at least once across the 10 (${MOTIF_LIST}), and vary fonts, layout, texture and ` +
            `heading case. For each style give: name (2-3 evocative words, unique), mood (one short line), ` +
            `background and backgroundEnd (hex gradient), text (hex, high contrast), muted (hex), accent (hex), ` +
            `accent2 (hex glow), headingFont and bodyFont (each one of: ${FONT_LIST}), headingCase ("normal" or ` +
            `"upper"), motif, layout ("centered" or "left"; split uses left), texture (boolean).\n\n` +
            `Return {"styles":[...10 styles...]}`,
        fallback: {},
    });
    return (res.styles ?? []).slice(0, 10).map((raw, i) => ({ ...sanitizeStyle(raw, i), category: category.name }));
}

async function main() {
    const results: (SlideStyle & { category: string })[][] = [];
    // A few batches at a time to stay well inside rate limits.
    for (let i = 0; i < CATEGORIES.length; i += 4) {
        const chunk = CATEGORIES.slice(i, i + 4);
        results.push(...(await Promise.all(chunk.map(batch))));
        console.log(`  ${Math.min(i + 4, CATEGORIES.length)}/${CATEGORIES.length} categories done`);
    }

    // Unique names and stable ids.
    const seen = new Set<string>();
    const library = results.flat().filter((s) => !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase()));
    library.forEach((s, i) => (s.id = `lib-${String(i + 1).padStart(3, "0")}`));

    const file = join(__dirname, "..", "lib", "slideStyleLibrary.json");
    writeFileSync(file, JSON.stringify(library, null, 1) + "\n");
    const motifs = new Map<string, number>();
    library.forEach((s) => motifs.set(s.motif, (motifs.get(s.motif) ?? 0) + 1));
    console.log(`Wrote ${library.length} styles to lib/slideStyleLibrary.json`);
    console.log("Motifs:", Object.fromEntries(motifs));
}

main().then(
    () => process.exit(0),
    (err) => {
        console.error(err);
        process.exit(1);
    }
);
