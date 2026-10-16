import { NextRequest } from "next/server";
import { analyzeSurvey } from "@/lib/analysis";
import { listResponses, saveAnalysis, updateSurvey } from "@/lib/db";
import { runJob } from "@/lib/jobs";
import { priceSurveyAnalysis } from "@/lib/modules";
import { audit } from "@/lib/audit";
import {
    handle,
    HttpError,
    requireChurchActor,
    requireModuleAccess,
    requireSurveyAccess,
} from "@/lib/session";
import { newId } from "@/lib/ids";
import { canAnalyze } from "@/lib/surveyTemplates";
import type { Analysis } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// Theme discovery, assignment, and the narrative are a multi-call job.
export const maxDuration = 600;

export async function POST(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        const survey = await requireSurveyAccess(id, actor);
        if (!canAnalyze(survey)) {
            throw new HttpError(403, "Custom surveys can't be analyzed. Start a Church Analysis survey to get AI themes.");
        }
        await requireModuleAccess("survey_analytics", actor);

        const responses = await listResponses(id);
        if (responses.length === 0) {
            throw new HttpError(400, "This survey has no responses to analyze yet.");
        }

        // The browser supplies the job id so it can poll for progress while
        // this request is still running.
        const body = await req.json().catch(() => ({}));
        const jobId = typeof body.jobId === "string" && body.jobId ? body.jobId : newId();
        const credits = priceSurveyAnalysis(responses.length);

        const job = await runJob<{ surveyId: string }, { analysisId: string }>({
            jobId,
            churchId: survey.churchId,
            moduleId: "survey_analytics",
            type: "survey.analyze",
            label: `Analysis of "${survey.title}" (${responses.length} responses)`,
            actorUid: actor.uid,
            input: { surveyId: id },
            credits,
            body: async (ctx) => {
                const result = await analyzeSurvey({
                    survey,
                    responses,
                    createdBy: actor.uid,
                    creditsSpent: credits,
                    onProgress: (step, total, message) => ctx.progress(step, total, message),
                });
                const analysis: Analysis = await saveAnalysis(result);
                await updateSurvey(id, { latestAnalysisId: analysis.id });
                return { analysisId: analysis.id };
            },
        });

        await audit({
            churchId: survey.churchId,
            actorUid: actor.uid,
            actorEmail: actor.email,
            action: "survey.analyzed",
            target: id,
            metadata: { responses: responses.length, credits },
        });

        return { jobId, analysisId: (job.result as { analysisId: string })?.analysisId ?? null };
    });
}
