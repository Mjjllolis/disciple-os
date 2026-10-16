import { NextRequest } from "next/server";
import { saveSermon } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";
import { sanitizeStyle } from "@/lib/slideStyles";
import type { SlideStyle } from "@/lib/types";
import { loadSermon } from "@/lib/sermonAccess";
import { generateSlideStyles } from "@/lib/slides";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Designs three style options for a sermon's slides. Free, so it's rate
 * limited instead; the styles are saved on the sermon so a reload keeps them.
 */
export async function POST(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("sermon_builder", actor);
        const sermon = await loadSermon(id, actor);
        await rateLimit({
            key: `slide-styles:${actor.churchId}`,
            limit: 10,
            windowSeconds: 600,
            message: "That's a lot of new styles. Please wait a few minutes and try again.",
        });

        // New AI picks replace the old AI picks only; library and recoloured styles stay.
        const fresh = await generateSlideStyles(sermon);
        const kept = (sermon.slideStyles ?? []).filter((st) => !isAiStyle(st.id));
        const slideStyles = [...fresh, ...kept];
        await saveSermon({ ...sermon, slideStyles });
        return { styles: slideStyles };
    });
}

/** The AI's per-sermon picks are style-1..3; library styles are lib-NNN, recolours custom-N. */
const isAiStyle = (id: string) => /^style-\d+$/.test(id);
const STYLE_ID = /^(style-\d+|lib-\d{3}|custom-\d+)$/;
/** Styles a sermon keeps: its AI picks plus the most recent library/custom ones. */
const MAX_STYLES = 12;

/**
 * Adds or updates one style on the sermon: a library style the church picked,
 * or any style with edited colours. Free; the style is re-sanitised so text
 * contrast always holds whatever colours were chosen.
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("sermon_builder", actor);
        const sermon = await loadSermon(id, actor);

        const { style: raw } = (await req.json()) as { style?: Partial<SlideStyle> };
        if (!raw || typeof raw.id !== "string" || !STYLE_ID.test(raw.id)) {
            throw new HttpError(400, "Unknown slide style.");
        }
        const style: SlideStyle = { ...sanitizeStyle(raw, 0), id: raw.id };

        const others = (sermon.slideStyles ?? []).filter((st) => st.id !== style.id);
        const ai = others.filter((st) => isAiStyle(st.id));
        const rest = [...others.filter((st) => !isAiStyle(st.id)), style].slice(-(MAX_STYLES - ai.length));
        const slideStyles = [...ai, ...rest];
        await saveSermon({ ...sermon, slideStyles });
        return { style, styles: slideStyles };
    });
}
