import { NextRequest } from "next/server";
import { addResponse, getSurveyByPublicSlug } from "@/lib/db";
import { handle, HttpError } from "@/lib/session";
import { parseAnswers } from "@/lib/validate";

type Ctx = { params: Promise<{ slug: string }> };

/** Coarse in-memory throttle. Swap for Redis if you run multiple instances. */
const recent = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function throttle(key: string) {
    const now = Date.now();
    const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (hits.length >= MAX_PER_WINDOW) {
        throw new HttpError(429, "Too many submissions from this device. Please wait a minute.");
    }
    hits.push(now);
    recent.set(key, hits);
    if (recent.size > 5000) recent.clear();
}

export async function POST(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { slug } = await params;
        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";
        throttle(`${slug}:${ip}`);

        const survey = await getSurveyByPublicSlug(slug);
        if (!survey) throw new HttpError(404, "This survey link is not valid.");
        if (survey.status !== "published") {
            throw new HttpError(403, "This survey is closed and no longer accepting responses.");
        }

        const body = await req.json();
        const answers = parseAnswers(survey.questions, body.answers);
        await addResponse({ surveyId: survey.id, churchId: survey.churchId, answers });

        // Deliberately anonymous: no id returned, nothing tying back to a person.
        return { ok: true };
    });
}
