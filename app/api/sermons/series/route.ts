import { NextRequest } from "next/server";
import { generateSermon, planSeries } from "@/lib/sermons";
import { getAnalysis, getSurvey, saveSeries, saveSermon } from "@/lib/db";
import { runJob } from "@/lib/jobs";
import { priceSermons } from "@/lib/modules";
import { audit } from "@/lib/audit";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";
import { newId } from "@/lib/ids";
import { str } from "@/lib/validate";

export const maxDuration = 900;

const MAX_WEEKS = 8;

/**
 * Plans a multi-week series from a survey's themes, then writes every week's
 * outline. This is the payoff of the analytics module: the survey tells you
 * what people are carrying, and this turns it into a teaching plan.
 */
export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        const church = await requireModuleAccess("sermon_builder", actor);

        const body = await req.json();
        const jobId = typeof body.jobId === "string" && body.jobId ? body.jobId : newId();
        const weeks = Math.max(2, Math.min(MAX_WEEKS, Number(body.weeks ?? 4)));
        const audience = str(body.audience, "Audience", { max: 200, required: false }) || "a Sunday morning congregation";

        const survey = await getSurvey(String(body.surveyId ?? ""));
        if (!survey || survey.churchId !== actor.churchId) {
            throw new HttpError(404, "Survey not found.");
        }
        const analysisId = String(body.analysisId ?? survey.latestAnalysisId ?? "");
        const analysis = analysisId ? await getAnalysis(survey.id, analysisId) : null;
        if (!analysis) {
            throw new HttpError(400, "Run an analysis on this survey first, so the series has themes to work from.");
        }
        // Optional subset of themes to build from; all of them when none are given.
        const chosen: string[] = Array.isArray(body.themeIds) ? body.themeIds.map(String) : [];
        const seriesThemes = chosen.length
            ? analysis.themes.filter((t) => chosen.includes(t.id))
            : analysis.themes;
        if (!seriesThemes.length) {
            throw new HttpError(400, "Choose at least one theme to build the series from.");
        }

        const credits = priceSermons(weeks, church);

        const job = await runJob<{ surveyId: string; weeks: number }, { seriesId: string; sermonIds: string[] }>({
            jobId,
            churchId: actor.churchId,
            moduleId: "sermon_builder",
            type: "sermon.series",
            label: `${weeks}-week series from "${survey.title}"`,
            actorUid: actor.uid,
            input: { surveyId: survey.id, weeks },
            credits,
            body: async (ctx) => {
                const total = weeks + 2;
                await ctx.progress(1, total, "Designing the series arc…");

                const themes = seriesThemes
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .map((t) => ({ label: t.label, description: t.description, count: t.count, group: t.groupLabel }));

                const plan = await planSeries({
                    themes,
                    weeks,
                    audience,
                    context: `The survey was titled "${survey.title}" and had ${analysis.responseCount} responses.`,
                });

                const now = new Date().toISOString();
                const series = await saveSeries({
                    churchId: actor.churchId,
                    title: plan.title,
                    premise: plan.premise,
                    weeks: plan.weeks.length,
                    sourceSurveyId: survey.id,
                    sourceAnalysisId: analysis.id,
                    createdAt: now,
                    createdBy: actor.uid,
                });

                const sermonIds: string[] = [];
                for (const [index, week] of plan.weeks.entries()) {
                    await ctx.progress(index + 2, total, `Writing week ${index + 1}: ${week.topic}`);

                    // Ground each week in the verbatims of its closest theme.
                    const theme = seriesThemes.find((t) =>
                        week.topic.toLowerCase().includes(t.label.toLowerCase().split(" ")[0])
                    );
                    const verbatims = theme
                        ? analysis.assignments
                              .filter((a) => a.themeId === theme.id)
                              .slice(0, 15)
                              .map((a) => `- ${a.answerText}`)
                              .join("\n")
                        : "";

                    const draft = await generateSermon({
                        topic: week.topic,
                        context: [week.angle, verbatims].filter(Boolean).join("\n\n"),
                        audience,
                        seriesTitle: plan.title,
                        seriesPremise: plan.premise,
                        weekNumber: index + 1,
                    });

                    const saved = await saveSermon({
                        ...draft,
                        churchId: actor.churchId,
                        seriesId: series.id,
                        weekNumber: index + 1,
                        sourceThemeLabel: theme?.label ?? null,
                        sourceSurveyId: survey.id,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        createdBy: actor.uid,
                    });
                    sermonIds.push(saved.id);
                }

                await ctx.progress(total, total, "Finishing up…");
                return { seriesId: series.id, sermonIds };
            },
        });

        await audit({
            churchId: actor.churchId,
            actorUid: actor.uid,
            actorEmail: actor.email,
            action: "sermon.series_generated",
            target: survey.id,
            metadata: { weeks, credits },
        });

        return { jobId, ...(job.result as { seriesId: string; sermonIds: string[] }) };
    });
}
