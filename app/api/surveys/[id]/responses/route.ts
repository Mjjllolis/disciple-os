import { NextRequest } from "next/server";
import { listResponses } from "@/lib/db";
import { handle, requireActor, requireSurveyAccess } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireActor();
        const survey = await requireSurveyAccess(id, actor);
        return { survey, responses: await listResponses(id) };
    });
}
