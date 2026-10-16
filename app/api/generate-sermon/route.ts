import { NextRequest } from "next/server";
import { generateSermon } from "@/lib/sermons";
import { adjustCredits, InsufficientCreditsError } from "@/lib/db";
import { priceSermons } from "@/lib/modules";
import { rateLimit } from "@/lib/rateLimit";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";

/**
 * Legacy endpoint kept for the Bible Categorizer's "generate a sermon" button.
 * It returns the old {title, verses, outline} shape. New work should use
 * /api/sermons/generate, which persists a full sermon.
 *
 * Like /api/categorize, this was unauthenticated and is now gated.
 */
export const maxDuration = 120;

export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        const church = await requireModuleAccess("sermon_builder", actor);
        await rateLimit({ key: `sermon-legacy:${actor.churchId}`, limit: 20, windowSeconds: 60 });

        const { question } = await req.json();
        if (typeof question !== "string" || !question.trim()) {
            throw new HttpError(400, "Provide a question to build the sermon around.");
        }

        const credits = priceSermons(1, church);
        try {
            await adjustCredits({
                churchId: actor.churchId,
                delta: -credits,
                reason: "Sermon outline",
                actorUid: actor.uid,
            });
        } catch (err) {
            if (err instanceof InsufficientCreditsError) throw new HttpError(402, err.message);
            throw err;
        }

        try {
            const sermon = await generateSermon({
                topic: question.trim().slice(0, 500),
                audience: "a Sunday morning congregation",
            });
            return {
                title: sermon.title,
                verses: sermon.scripture,
                outline: sermon.points.map((p) => p.heading),
            };
        } catch {
            await adjustCredits({
                churchId: actor.churchId,
                delta: credits,
                reason: "Refund — sermon generation failed",
                actorUid: "system",
            }).catch(() => {});
            throw new HttpError(500, "Sermon generation failed and your credits were refunded.");
        }
    });
}
