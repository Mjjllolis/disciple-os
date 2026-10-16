import { NextRequest } from "next/server";
import { generateJson } from "@/lib/ai";
import { adjustCredits, InsufficientCreditsError } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";

/**
 * Standalone categorizer behind /dashboard/tools/categorizer.
 *
 * This used to be unauthenticated, which let anyone on the internet spend the
 * platform's AI budget. It now requires a signed-in church, the analytics
 * entitlement, a rate limit, and credits — same as every other metered route.
 */
export const maxDuration = 300;

const MAX_QUESTIONS = 200;
const CREDITS_PER_QUESTION = 1;

export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        await requireModuleAccess("survey_analytics", actor);
        await rateLimit({ key: `categorize:${actor.churchId}`, limit: 10, windowSeconds: 60 });

        const { questions, categories } = await req.json();

        if (!Array.isArray(questions) || !Array.isArray(categories) || !questions.length || !categories.length) {
            throw new HttpError(400, "Provide both questions and categories.");
        }
        if (questions.length > MAX_QUESTIONS) {
            throw new HttpError(400, `At most ${MAX_QUESTIONS} questions per run.`);
        }

        const credits = questions.length * CREDITS_PER_QUESTION;
        try {
            await adjustCredits({
                churchId: actor.churchId,
                delta: -credits,
                reason: `Categorized ${questions.length} questions`,
                actorUid: actor.uid,
            });
        } catch (err) {
            if (err instanceof InsufficientCreditsError) throw new HttpError(402, err.message);
            throw err;
        }

        try {
            const names = categories.map((c: { name: string }) => c.name).join(", ");

            const categorizedResults = await Promise.all(
                questions.map(async (question: { text: string }) => {
                    const parsed = await generateJson<{ name?: string; confidence?: number }>({
                        effort: "low",
                        maxTokens: 1000,
                        system: "You categorize Bible questions.",
                        prompt:
                            `Classify this Bible question: "${question.text}" into the single most ` +
                            `relevant category from: ${names}.\n` +
                            `Return {"name": "Category", "confidence": 95}.`,
                        fallback: {},
                    });
                    return {
                        question: question.text,
                        categories: [
                            {
                                name: parsed.name ?? "Uncategorized",
                                confidence: Number(parsed.confidence ?? 0),
                            },
                        ],
                    };
                })
            );

            return categorizedResults;
        } catch {
            await adjustCredits({
                churchId: actor.churchId,
                delta: credits,
                reason: "Refund — categorization failed",
                actorUid: "system",
            }).catch(() => {});
            throw new HttpError(500, "Categorization failed and your credits were refunded.");
        }
    });
}
