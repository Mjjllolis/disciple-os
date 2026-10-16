import { NextRequest } from "next/server";
import { generateSermon } from "@/lib/sermons";
import { getAnalysis, getSurvey, saveSermon } from "@/lib/db";
import { runJob } from "@/lib/jobs";
import { priceSermons } from "@/lib/modules";
import { audit } from "@/lib/audit";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";
import { newId } from "@/lib/ids";
import { str } from "@/lib/validate";
import type { Sermon } from "@/lib/types";

export const maxDuration = 300;

/**
 * Generates and stores one sermon. When `themeIds` are supplied the topic and
 * supporting context come from a survey analysis, so the outline is grounded in
 * what the congregation actually wrote rather than a generic prompt.
 */
export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        const church = await requireModuleAccess("sermon_builder", actor);

        const body = await req.json();
        const jobId = typeof body.jobId === "string" && body.jobId ? body.jobId : newId();
        const audience = str(body.audience, "Audience", { max: 200, required: false }) || "a Sunday morning congregation";
        const setting = str(body.setting, "Setting", { max: 200, required: false });
        const scriptureHint = str(body.scriptureHint, "Passage", { max: 200, required: false });

        let topic = str(body.topic, "Topic", { max: 300, required: false });
        let context = "";
        let sourceThemeLabel: string | null = null;
        let sourceSurveyId: string | null = null;

        // themeIds: any number of the analysis's themes; themeId is the older single-theme form.
        const themeIds: string[] = Array.isArray(body.themeIds)
            ? body.themeIds.map(String).slice(0, 12)
            : body.themeId
              ? [String(body.themeId)]
              : [];

        if (body.surveyId && body.analysisId && themeIds.length) {
            const survey = await getSurvey(String(body.surveyId));
            if (!survey || survey.churchId !== actor.churchId) {
                throw new HttpError(404, "Survey not found.");
            }
            const analysis = await getAnalysis(survey.id, String(body.analysisId));
            if (!analysis) throw new HttpError(404, "Analysis not found.");

            const themes = analysis.themes.filter((t) => themeIds.includes(t.id));
            if (!themes.length) throw new HttpError(404, "Those themes are not part of this analysis.");

            const labels = themes.map((t) => t.label);
            // A typed topic, if any, sets the sermon's focus; the themes ground it.
            topic = topic || labels.join(" & ");
            sourceThemeLabel = labels.join(", ");
            sourceSurveyId = survey.id;
            // Share the verbatim budget across the themes so each is represented.
            const perTheme = Math.max(5, Math.floor(25 / themes.length));
            context = themes
                .map((theme) => {
                    const verbatims = analysis.assignments
                        .filter((a) => a.themeId === theme.id)
                        .slice(0, perTheme)
                        .map((a) => `- ${a.answerText}`)
                        .join("\n");
                    const group = theme.groupLabel ? ` [${theme.groupLabel}]` : "";
                    return `${theme.label}${group}: ${theme.description}\nAnswers (${theme.count} total):\n${verbatims}`;
                })
                .join("\n\n");
            if (themes.length > 1) {
                context = `Address these ${themes.length} themes together in one sermon.\n\n${context}`;
            }
        }

        if (!topic) throw new HttpError(400, "Choose a survey theme or enter a topic.");

        const credits = priceSermons(1, church);

        const job = await runJob<{ topic: string }, { sermonId: string }>({
            jobId,
            churchId: actor.churchId,
            moduleId: "sermon_builder",
            type: "sermon.generate",
            label: `Sermon — ${topic}`,
            actorUid: actor.uid,
            input: { topic },
            credits,
            body: async (ctx) => {
                await ctx.progress(1, 2, "Studying the topic and choosing passages…");
                const draft = await generateSermon({ topic, context, audience, setting, scriptureHint });

                await ctx.progress(2, 2, "Saving your outline…");
                const now = new Date().toISOString();
                const sermon: Sermon = await saveSermon({
                    ...draft,
                    churchId: actor.churchId,
                    sourceThemeLabel,
                    sourceSurveyId,
                    createdAt: now,
                    updatedAt: now,
                    createdBy: actor.uid,
                });
                return { sermonId: sermon.id };
            },
        });

        await audit({
            churchId: actor.churchId,
            actorUid: actor.uid,
            actorEmail: actor.email,
            action: "sermon.generated",
            metadata: { topic, credits },
        });

        return { jobId, sermonId: (job.result as { sermonId: string })?.sermonId ?? null };
    });
}
