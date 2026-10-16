import { NextRequest } from "next/server";
import { getAnalysis, listAnalyses } from "@/lib/db";
import { handle, HttpError, requireActor, requireSurveyAccess } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/** ?analysisId=... returns one full analysis; otherwise the list of summaries. */
export async function GET(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireActor();
        const survey = await requireSurveyAccess(id, actor);

        const analysisId = req.nextUrl.searchParams.get("analysisId") ?? survey.latestAnalysisId;
        if (analysisId) {
            const analysis = await getAnalysis(id, analysisId);
            if (!analysis) throw new HttpError(404, "Analysis not found.");
            return { survey, analysis };
        }
        return { survey, analysis: null, analyses: await listAnalyses(id) };
    });
}
