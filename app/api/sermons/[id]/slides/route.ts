import { NextRequest } from "next/server";
import { saveSermon } from "@/lib/db";
import { runJob } from "@/lib/jobs";
import { priceSlides } from "@/lib/modules";
import { newId } from "@/lib/ids";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";
import { loadSermon } from "@/lib/sermonAccess";
import { generateSlides } from "@/lib/slides";
import type { SlideDeck } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

/** Writes the full deck in the chosen style. Metered: credits are refunded if it fails. */
export async function POST(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        const church = await requireModuleAccess("sermon_builder", actor);
        const sermon = await loadSermon(id, actor);

        const body = await req.json();
        const jobId = typeof body.jobId === "string" && body.jobId ? body.jobId : newId();
        const styleId = String(body.styleId ?? "");
        if (!sermon.slideStyles?.some((s) => s.id === styleId)) {
            throw new HttpError(400, "Pick one of the slide styles first.");
        }

        const job = await runJob<{ sermonId: string }, { slideCount: number }>({
            jobId,
            churchId: actor.churchId,
            moduleId: "sermon_builder",
            type: "sermon.slides",
            label: `Slides — ${sermon.title}`,
            actorUid: actor.uid,
            input: { sermonId: id },
            credits: priceSlides(church),
            body: async (ctx) => {
                await ctx.progress(1, 2, "Writing your slides…");
                const slides = await generateSlides(sermon);
                await ctx.progress(2, 2, "Saving the deck…");
                const deck: SlideDeck = { styleId, slides, createdAt: new Date().toISOString() };
                await saveSermon({ ...sermon, slides: deck });
                return { slideCount: slides.length };
            },
        });

        return { jobId, slideCount: (job.result as { slideCount: number } | null)?.slideCount ?? 0 };
    });
}

/** Switches the deck to another of its styles. Free: no AI involved. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("sermon_builder", actor);
        const sermon = await loadSermon(id, actor);
        const { styleId } = await req.json();
        if (!sermon.slides) throw new HttpError(400, "This sermon has no slides yet.");
        if (!sermon.slideStyles?.some((s) => s.id === styleId)) throw new HttpError(400, "Unknown slide style.");
        await saveSermon({ ...sermon, slides: { ...sermon.slides, styleId } });
        return { ok: true };
    });
}
