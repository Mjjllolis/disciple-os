import { NextRequest } from "next/server";
import { generateImage, IMAGE_SIZES } from "@/lib/images";
import { saveImage } from "@/lib/db";
import { runJob } from "@/lib/jobs";
import { priceImages } from "@/lib/modules";
import { audit } from "@/lib/audit";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";
import { newId } from "@/lib/ids";
import { str } from "@/lib/validate";
import type { ImagePurpose } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        const church = await requireModuleAccess("image_studio", actor);

        const body = await req.json();
        const jobId = typeof body.jobId === "string" && body.jobId ? body.jobId : newId();
        const prompt = str(body.prompt, "Description", { max: 1000 });
        const styleNote = str(body.styleNote, "Style", { max: 300, required: false });
        const purpose = String(body.purpose ?? "series_art") as ImagePurpose;

        if (!IMAGE_SIZES[purpose]) throw new HttpError(400, "Unknown image type.");

        const credits = priceImages(1, church);

        const job = await runJob<{ prompt: string; purpose: ImagePurpose }, { imageId: string; url: string }>({
            jobId,
            churchId: actor.churchId,
            moduleId: "image_studio",
            type: "image.generate",
            label: `Image — ${prompt.slice(0, 60)}`,
            actorUid: actor.uid,
            input: { prompt, purpose },
            credits,
            body: async (ctx) => {
                await ctx.progress(1, 2, "Generating your image…");
                const generated = await generateImage({
                    churchId: actor.churchId,
                    purpose,
                    prompt,
                    styleNote: styleNote || undefined,
                });

                await ctx.progress(2, 2, "Saving to your library…");
                const saved = await saveImage({
                    churchId: actor.churchId,
                    purpose,
                    prompt,
                    revisedPrompt: generated.revisedPrompt,
                    url: generated.url,
                    storagePath: generated.storagePath,
                    size: generated.size,
                    createdAt: new Date().toISOString(),
                    createdBy: actor.uid,
                    sermonId: typeof body.sermonId === "string" ? body.sermonId : null,
                    seriesId: typeof body.seriesId === "string" ? body.seriesId : null,
                });
                return { imageId: saved.id, url: saved.url };
            },
        });

        await audit({
            churchId: actor.churchId,
            actorUid: actor.uid,
            actorEmail: actor.email,
            action: "image.generated",
            metadata: { purpose, credits },
        });

        return { jobId, ...(job.result as { imageId: string; url: string }) };
    });
}
