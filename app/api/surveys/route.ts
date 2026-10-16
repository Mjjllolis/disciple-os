import { NextRequest } from "next/server";
import { createSurvey, listSurveysForChurch, updateSurvey } from "@/lib/db";
import { newId } from "@/lib/ids";
import { handle, requireChurchActor } from "@/lib/session";
import { CHURCH_ANALYSIS_TEMPLATE } from "@/lib/surveyTemplates";
import { parseQuestions, str } from "@/lib/validate";

export async function GET() {
    return handle(async () => {
        const actor = await requireChurchActor();
        return { surveys: await listSurveysForChurch(actor.churchId) };
    });
}

/**
 * kind "church_analysis": questions come from the fixed template (anything the
 * browser sent is ignored) and the survey is published at once, so the church
 * gets its share link immediately.
 * kind "custom" (the default): the church's own questions, saved as a draft.
 */
export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        const body = await req.json();

        if (body.kind === "church_analysis") {
            const title = str(body.title, "Survey title", { max: 200, required: false });
            const survey = await createSurvey({
                churchId: actor.churchId,
                createdBy: actor.uid,
                kind: "church_analysis",
                title: title || CHURCH_ANALYSIS_TEMPLATE.defaultTitle(),
                description: CHURCH_ANALYSIS_TEMPLATE.description,
                questions: CHURCH_ANALYSIS_TEMPLATE.questions.map((q) => ({ ...q, id: newId() })),
            });
            const publishedAt = new Date().toISOString();
            await updateSurvey(survey.id, { status: "published", publishedAt });
            return { survey: { ...survey, status: "published", publishedAt } };
        }

        const survey = await createSurvey({
            churchId: actor.churchId,
            createdBy: actor.uid,
            kind: "custom",
            title: str(body.title, "Survey title", { max: 200 }),
            description: str(body.description, "Description", { max: 2000, required: false }),
            questions: parseQuestions(body.questions),
        });
        return { survey };
    });
}
