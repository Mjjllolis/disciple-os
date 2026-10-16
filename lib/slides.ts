import { generateJson } from "./ai";
import { SLIDE_FONTS, sanitizeStyle } from "./slideStyles";
import type { Sermon, Slide, SlideKind, SlideStyle } from "./types";

const FONT_LIST = Object.keys(SLIDE_FONTS).join(", ");

function outline(sermon: Sermon): string {
    return [
        `Title: ${sermon.title}`,
        sermon.bigIdea && `Big idea: ${sermon.bigIdea}`,
        sermon.scripture.length && `Scripture: ${sermon.scripture.join("; ")}`,
        ...sermon.points.map(
            (p, i) => `Point ${i + 1}: ${p.heading}${p.verses.length ? ` (${p.verses.join("; ")})` : ""}\n${p.body}`
        ),
        sermon.illustrations.length && `Illustrations:\n- ${sermon.illustrations.join("\n- ")}`,
        sermon.application.length && `Application:\n- ${sermon.application.join("\n- ")}`,
        sermon.closingPrayer && `Closing prayer: ${sermon.closingPrayer}`,
    ]
        .filter(Boolean)
        .join("\n\n");
}

/** Three distinct visual directions for this sermon's slides. */
export async function generateSlideStyles(sermon: Sermon): Promise<SlideStyle[]> {
    const res = await generateJson<{ styles?: Partial<SlideStyle>[] }>({
        effort: "low",
        maxTokens: 4000,
        system:
            "You are an award-winning church presentation designer. Your decks feel custom-made for each " +
            "sermon: distinctive palettes, characterful type, and artwork that echoes the message, while staying " +
            "legible from the back row.",
        prompt:
            `Sermon: "${sermon.title}"${sermon.bigIdea ? ` — ${sermon.bigIdea}` : ""}\n` +
            (sermon.scripture.length ? `Passages: ${sermon.scripture.join("; ")}\n` : "") +
            `\nDesign 3 bold, clearly different slide styles drawn from this sermon's imagery and mood. Avoid ` +
            `generic navy-and-beige: think jewel tones, dawn skies, candlelight, deep forest, stone and gold, ` +
            `ink and paper. Each style must use a DIFFERENT motif. For each give:\n` +
            `- name (2-3 evocative words) and mood (one short line)\n` +
            `- background and backgroundEnd (hex; a rich gradient), text (hex, high contrast), muted (hex, ` +
            `secondary text), accent (hex, for rules and numbers), accent2 (hex, a glow/highlight colour for the artwork)\n` +
            `- headingFont and bodyFont (each one of: ${FONT_LIST}); headingCase ("normal" or "upper")\n` +
            `- motif, one of: rays (light shafts), arch (cathedral arch), horizon (rising sun), frame (ornate ` +
            `border), contours (flowing lines), constellation (stars), cross (a large quiet cross), split (colour ` +
            `panel on the left). Pick motifs that fit the sermon's imagery.\n` +
            `- layout ("centered" or "left"; split motifs always use left), texture (true for a film-grain finish)\n\n` +
            `Return {"styles":[{...},{...},{...}]}`,
        fallback: {},
    });
    const styles = (res.styles ?? []).slice(0, 3).map(sanitizeStyle);
    if (styles.length < 3) throw new Error("The AI didn't return three slide styles. Please try again.");
    return styles;
}

const KINDS: SlideKind[] = ["title", "big_idea", "scripture", "point", "list", "statement", "closing"];

/** The full deck for a sermon. Text only; the chosen style is applied when it's shown. */
export async function generateSlides(sermon: Sermon): Promise<Slide[]> {
    const res = await generateJson<{ slides?: Partial<Slide>[] }>({
        effort: "medium",
        maxTokens: 12000,
        system:
            "You turn sermon outlines into projection slides for a church service. Slides are read from the " +
            "back row, so each carries one idea in very few words. Quote Scripture accurately from the King James " +
            "Version (public domain) and label it (KJV); never invent or misquote a verse.",
        prompt:
            `${outline(sermon)}\n\n` +
            `Make 10-16 slides in preaching order. Slide kinds:\n` +
            `- title: heading = sermon title, body = a short subtitle\n` +
            `- big_idea: body = the big idea, max 20 words\n` +
            `- scripture: reference (e.g. "Matthew 24:6 (KJV)"), body = the verse text, max 45 words (use the key verse of a long passage)\n` +
            `- point: number, heading = the point (max 8 words), body = one supporting line (max 18 words)\n` +
            `- list: heading, bullets (2-4, max 10 words each), e.g. "This week" for application\n` +
            `- statement: body = one memorable line, max 16 words\n` +
            `- closing: heading (e.g. "Let's pray"), body = a one or two line prayer or blessing, max 30 words\n\n` +
            `Start with title then big_idea; give each point its own point slide, followed by its key scripture ` +
            `where it has one; end with a list for application and a closing slide.\n\n` +
            `Return {"slides":[{"kind":"title","heading":"...","body":"..."}, ...]}`,
        fallback: {},
    });

    const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
    const slides = (res.slides ?? [])
        .filter((s) => KINDS.includes(s.kind as SlideKind))
        .slice(0, 24)
        .map((s) => ({
            kind: s.kind as SlideKind,
            heading: clean(s.heading, 140),
            body: clean(s.body, 400),
            reference: clean(s.reference, 80),
            bullets: Array.isArray(s.bullets) ? s.bullets.map((b) => String(b).slice(0, 120)).slice(0, 6) : undefined,
            number: typeof s.number === "number" ? s.number : undefined,
        }));
    if (slides.length < 3) throw new Error("The AI didn't return a usable deck. Please try again.");
    return slides;
}
