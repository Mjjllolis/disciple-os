import { NextRequest } from "next/server";
import { getChurch, getSurveyByPublicSlug } from "@/lib/db";
import { handle, HttpError } from "@/lib/session";

type Ctx = { params: Promise<{ slug: string }> };

/** Public, unauthenticated. Returns only what's needed to render the form. */
export async function GET(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { slug } = await params;
        const survey = await getSurveyByPublicSlug(slug);
        if (!survey) throw new HttpError(404, "This survey link is not valid.");
        if (survey.status === "draft") throw new HttpError(404, "This survey is not open yet.");

        const church = await getChurch(survey.churchId);

        return {
            survey: {
                id: survey.id,
                title: survey.title,
                description: survey.description ?? "",
                questions: survey.questions,
                status: survey.status,
            },
            churchName: church?.name ?? "",
        };
    });
}
