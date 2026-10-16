import { NextRequest } from "next/server";
import { deleteSurvey, listAnalyses, updateSurvey } from "@/lib/db";
import { handle, HttpError, requireActor, requireSurveyAccess } from "@/lib/session";
import { parseQuestions, str } from "@/lib/validate";
import type { Survey } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireActor();
        const survey = await requireSurveyAccess(id, actor);
        return { survey, analyses: await listAnalyses(id) };
    });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireActor();
        const survey = await requireSurveyAccess(id, actor);
        const body = await req.json();

        const patch: Partial<Survey> = {};

        if (body.title !== undefined) patch.title = str(body.title, "Survey title", { max: 200 });
        if (body.description !== undefined) {
            patch.description = str(body.description, "Description", { max: 2000, required: false });
        }
        if (body.questions !== undefined) {
            if (survey.kind === "church_analysis") {
                throw new HttpError(409, "Church Analysis questions are fixed so every analysis compares like with like.");
            }
            if (survey.responseCount > 0) {
                throw new HttpError(
                    409,
                    "This survey already has responses, so its questions are locked. Duplicate it to make changes."
                );
            }
            patch.questions = parseQuestions(body.questions);
        }
        if (body.status !== undefined) {
            const next = String(body.status);
            if (!["draft", "published", "closed"].includes(next)) {
                throw new HttpError(400, "Unknown survey status.");
            }
            if (next === "published" && survey.status === "draft") patch.publishedAt = new Date().toISOString();
            if (next === "closed") patch.closedAt = new Date().toISOString();
            patch.status = next as Survey["status"];
        }

        await updateSurvey(id, patch);
        return { ok: true };
    });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireActor();
        await requireSurveyAccess(id, actor);
        await deleteSurvey(id);
        return { ok: true };
    });
}
