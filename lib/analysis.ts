import { AI_MODEL, generateJson } from "./ai";
import { groupProfile } from "./surveyTemplates";
import { newId } from "./ids";
import type {
    Analysis,
    AnswerValue,
    ChoiceBreakdown,
    SegmentBreakdown,
    Survey,
    SurveyQuestion,
    SurveyResponse,
    Theme,
    ThemeAssignment,
} from "./types";

export const ANALYSIS_MODEL = AI_MODEL;

/** Credits charged per response included in a run (minimum 1 per run). */
export const CREDITS_PER_RESPONSE = 1;

export function creditCostFor(responseCount: number): number {
    return Math.max(1, responseCount * CREDITS_PER_RESPONSE);
}

/** Answers longer than this are truncated before being sent to the model. */
const MAX_ANSWER_CHARS = 400;
/** How many answers to show the model when discovering the taxonomy. */
const MAX_DISCOVERY_SAMPLE = 400;
/** Answers per assignment request. */
const ASSIGN_BATCH = 40;
/** Concurrent assignment requests. */
const ASSIGN_CONCURRENCY = 4;

function asText(value: AnswerValue | undefined): string {
    if (value == null) return "";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
}

function clean(text: string): string {
    return text.replace(/\s+/g, " ").trim().slice(0, MAX_ANSWER_CHARS);
}

function groupOf(q: SurveyQuestion): string {
    return q.themeGroup?.trim() || q.id;
}

/** Runs `tasks` with bounded concurrency, preserving order. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
    const out = new Array<R>(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (true) {
            const i = cursor++;
            if (i >= items.length) return;
            out[i] = await fn(items[i], i);
        }
    });
    await Promise.all(workers);
    return out;
}

/* --------------------------------------------------------- free-text pass --- */

interface TextItem {
    responseId: string;
    questionId: string;
    text: string;
}

/** Ask the model to derive a theme taxonomy from the answers in one group. */
async function discoverThemes(
    groupLabel: string,
    items: TextItem[],
    guidance: string
): Promise<{ label: string; description: string }[]> {
    const sample = items.length > MAX_DISCOVERY_SAMPLE
        ? items.filter((_, i) => i % Math.ceil(items.length / MAX_DISCOVERY_SAMPLE) === 0)
        : items;

    const target = Math.min(12, Math.max(4, Math.round(Math.sqrt(items.length))));

    const res = await generateJson<Record<string, unknown>>({
        effort: "medium",
        system:
            "You analyze anonymous congregation survey responses for church leadership. " +
                "You produce clear, pastoral, non-judgmental theme taxonomies. " +
                "Themes must be concrete and actionable, never vague buckets like 'Other' or 'Misc'.",
        prompt:
            `These are anonymous answers to: "${groupLabel}".\n` +
                (guidance ? `${guidance}\n` : "") +
                `\n` +
                sample.map((it, i) => `${i + 1}. ${it.text}`).join("\n") +
                `\n\nGroup these into about ${target} distinct, non-overlapping themes that a pastor ` +
                `could plan teaching around. Every answer must fit one theme. Use short title-case labels ` +
                `(2-5 words).\n\nReturn JSON: ` +
                `{"themes":[{"label":"...","description":"one sentence explaining what belongs here"}]}`,
        fallback: {},
    });

    const parsed = res as { themes?: { label?: string; description?: string }[] };
    const themes = (parsed.themes ?? [])
        .filter((t) => t.label?.trim())
        .map((t) => ({ label: t.label!.trim(), description: (t.description ?? "").trim() }));

    return themes.length ? themes : [{ label: "General", description: "Uncategorized responses." }];
}

/** Assign each answer in a batch to one of the discovered themes. */
async function assignBatch(
    groupLabel: string,
    themes: Theme[],
    batch: TextItem[],
    guidance: string
): Promise<Map<number, { themeIndex: number; confidence: number }>> {
    const res = await generateJson<Record<string, unknown>>({
        effort: "low",
        system:
            "You assign survey answers to a fixed theme list. Return only valid JSON.",
        prompt:
            `Question: "${groupLabel}"\n` +
                (guidance ? `${guidance}\n` : "") +
                `\nThemes:\n` +
                themes.map((t, i) => `${i}. ${t.label} — ${t.description}`).join("\n") +
                `\n\nAnswers:\n` +
                batch.map((it, i) => `${i}. ${it.text}`).join("\n") +
                `\n\nFor every answer, pick the single best theme index and a confidence 0-100. ` +
                `Return JSON: {"assignments":[{"answer":0,"theme":0,"confidence":90}]}`,
        fallback: {},
    });

    const parsed = res as { assignments?: { answer?: number; theme?: number; confidence?: number }[] };

    const map = new Map<number, { themeIndex: number; confidence: number }>();
    for (const a of parsed.assignments ?? []) {
        if (typeof a.answer !== "number" || typeof a.theme !== "number") continue;
        if (a.answer < 0 || a.answer >= batch.length) continue;
        if (a.theme < 0 || a.theme >= themes.length) continue;
        map.set(a.answer, { themeIndex: a.theme, confidence: Number(a.confidence ?? 50) });
    }
    return map;
}

/* ------------------------------------------------------------- tallies --- */

function buildChoiceBreakdowns(
    survey: Survey,
    responses: SurveyResponse[]
): ChoiceBreakdown[] {
    const out: ChoiceBreakdown[] = [];
    for (const q of survey.questions) {
        if (q.type !== "single_choice" && q.type !== "multi_choice" && q.type !== "scale") continue;
        const counts = new Map<string, number>();
        for (const r of responses) {
            const raw = r.answers[q.id];
            if (raw == null || raw === "") continue;
            const values = Array.isArray(raw) ? raw : [raw];
            for (const v of values) {
                const key = String(v).trim();
                if (!key) continue;
                counts.set(key, (counts.get(key) ?? 0) + 1);
            }
        }
        out.push({
            questionId: q.id,
            prompt: q.prompt,
            type: q.type,
            counts: [...counts.entries()]
                .map(([label, count]) => ({ label, count }))
                .sort((a, b) => b.count - a.count),
        });
    }
    return out;
}

function buildSegmentBreakdowns(
    survey: Survey,
    responses: SurveyResponse[],
    assignments: ThemeAssignment[]
): SegmentBreakdown[] {
    const segmentQuestions = survey.questions.filter((q) => q.isSegment);
    if (!segmentQuestions.length) return [];

    const byResponse = new Map<string, ThemeAssignment[]>();
    for (const a of assignments) {
        const list = byResponse.get(a.responseId) ?? [];
        list.push(a);
        byResponse.set(a.responseId, list);
    }

    return segmentQuestions.map((sq) => {
        const rows = new Map<string, { total: number; themes: Record<string, number> }>();
        for (const r of responses) {
            const segment = asText(r.answers[sq.id]).trim() || "Not answered";
            const row = rows.get(segment) ?? { total: 0, themes: {} };
            row.total += 1;
            for (const a of byResponse.get(r.id) ?? []) {
                row.themes[a.themeId] = (row.themes[a.themeId] ?? 0) + 1;
            }
            rows.set(segment, row);
        }
        return {
            segmentQuestionId: sq.id,
            segmentPrompt: sq.prompt,
            rows: [...rows.entries()]
                .map(([segment, v]) => ({ segment, total: v.total, themes: v.themes }))
                .sort((a, b) => b.total - a.total),
        };
    });
}

/* ------------------------------------------------------------ insights --- */

async function writeInsights(
    survey: Survey,
    themes: Theme[],
    responseCount: number,
    segments: SegmentBreakdown[]
): Promise<string[]> {
    // One block per group, so life challenges and teaching questions stay distinct.
    const byGroup = new Map<string, Theme[]>();
    for (const t of themes) {
        const label = t.groupLabel ?? "Themes";
        byGroup.set(label, [...(byGroup.get(label) ?? []), t]);
    }
    const themeLines = [...byGroup.entries()]
        .map(
            ([label, list]) =>
                `${label}:\n` +
                list
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 12)
                    .map((t) => `- ${t.label}: ${t.count} mentions (${t.description})`)
                    .join("\n")
        )
        .join("\n\n");

    const segmentLines = segments
        .map((s) => `${s.segmentPrompt}: ` + s.rows.map((r) => `${r.segment} (${r.total})`).join(", "))
        .join("\n");

    const res = await generateJson<Record<string, unknown>>({
        effort: "medium",
        system:
            "You brief church leadership on anonymous congregation survey results. " +
                "Be specific, warm, and practical. Cite the numbers you were given; never invent any.",
        prompt:
            `Survey: "${survey.title}" — ${responseCount} responses.\n\n${themeLines}\n\n` +
                (segmentLines ? `Segments:\n${segmentLines}\n\n` : "") +
                `Write 5-7 short findings for the leadership team. Each is one or two sentences, ` +
                `leads with what the data shows, and where useful suggests a concrete next step ` +
                `(a sermon series, a class, a care ministry).\n` +
                `Life challenges are what people are carrying; questions are what they want taught. ` +
                `Keep them distinct: don't present a life challenge as a teaching question or the reverse.\n\n` +
                `Return JSON: {"insights":["...","..."]}`,
        fallback: {},
    });

    const parsed = res as { insights?: string[] };
    return (parsed.insights ?? []).filter((s) => typeof s === "string" && s.trim()).slice(0, 8);
}

/* ------------------------------------------------------------- entrypoint --- */

/**
 * Runs the full analysis for a survey. Pure with respect to storage — the
 * caller persists the result and settles credits.
 */
export async function analyzeSurvey(input: {
    survey: Survey;
    responses: SurveyResponse[];
    createdBy: string;
    creditsSpent: number;
    onProgress?: (step: number, total: number, message: string) => Promise<void> | void;
}): Promise<Omit<Analysis, "id">> {
    const { survey, responses } = input;
    const report = async (step: number, total: number, message: string) => {
        try {
            await input.onProgress?.(step, total, message);
        } catch {
            /* progress is best-effort */
        }
    };

    // Bucket every free-text answer by theme group.
    const groups = new Map<string, { label: string; questions: SurveyQuestion[]; items: TextItem[] }>();
    for (const q of survey.questions) {
        const isFreeText = q.type === "short_text" || q.type === "long_text";
        if (!isFreeText || !q.aiCategorize) continue;
        const key = groupOf(q);
        const g = groups.get(key) ?? { label: q.prompt, questions: [], items: [] };
        g.questions.push(q);
        groups.set(key, g);
    }
    for (const [key, g] of groups) {
        // A shared group gets a label that reads well in prompts and charts.
        if (g.questions.length > 1) g.label = groupProfile(key)?.title ?? key.replace(/[-_]/g, " ");
        for (const r of responses) {
            for (const q of g.questions) {
                const text = clean(asText(r.answers[q.id]));
                if (text.length < 2) continue;
                g.items.push({ responseId: r.id, questionId: q.id, text });
            }
        }
    }

    const themes: Theme[] = [];
    const assignments: ThemeAssignment[] = [];

    // Two steps per group (discover, assign) plus tallies and the narrative.
    const totalSteps = groups.size * 2 + 2;
    let step = 0;

    for (const [key, g] of groups) {
        if (!g.items.length) continue;
        const guidance = groupProfile(key)?.guidance ?? "";

        await report(++step, totalSteps, `Finding themes in "${g.label}"…`);
        const discovered = await discoverThemes(g.label, g.items, guidance);
        const groupThemes: Theme[] = discovered.map((d) => ({
            id: newId(),
            label: d.label,
            description: d.description,
            questionIds: g.questions.map((q) => q.id),
            count: 0,
            examples: [],
            groupKey: key,
            groupLabel: g.label,
        }));

        const batches: TextItem[][] = [];
        for (let i = 0; i < g.items.length; i += ASSIGN_BATCH) {
            batches.push(g.items.slice(i, i + ASSIGN_BATCH));
        }

        await report(
            ++step,
            totalSteps,
            `Sorting ${g.items.length} answers into ${groupThemes.length} themes…`
        );
        const results = await pool(batches, ASSIGN_CONCURRENCY, (batch) =>
            assignBatch(g.label, groupThemes, batch, guidance).catch(() => new Map())
        );

        results.forEach((map, bi) => {
            batches[bi].forEach((item, ii) => {
                const hit = map.get(ii);
                // Unassignable answers land in the first theme at zero confidence
                // rather than vanishing from the totals.
                const theme = groupThemes[hit?.themeIndex ?? 0];
                theme.count += 1;
                if (theme.examples.length < 5) theme.examples.push(item.text);
                assignments.push({
                    responseId: item.responseId,
                    questionId: item.questionId,
                    answerText: item.text,
                    themeId: theme.id,
                    confidence: hit ? Math.max(0, Math.min(100, hit.confidence)) : 0,
                });
            });
        });

        themes.push(...groupThemes.filter((t) => t.count > 0));
    }

    await report(++step, totalSteps, "Building charts…");
    const choiceBreakdowns = buildChoiceBreakdowns(survey, responses);
    const segmentBreakdowns = buildSegmentBreakdowns(survey, responses, assignments);

    await report(++step, totalSteps, "Writing the leadership summary…");
    let insights: string[] = [];
    try {
        insights = await writeInsights(survey, themes, responses.length, segmentBreakdowns);
    } catch (err) {
        // Charts are the product; a missing narrative should not fail the run.
        console.error("[analysis] insight generation failed", err);
    }

    const now = new Date().toISOString();
    return {
        surveyId: survey.id,
        churchId: survey.churchId,
        status: "complete",
        createdAt: now,
        completedAt: now,
        createdBy: input.createdBy,
        model: ANALYSIS_MODEL,
        responseCount: responses.length,
        creditsSpent: input.creditsSpent,
        themes,
        assignments,
        choiceBreakdowns,
        segmentBreakdowns,
        insights,
        error: null,
    };
}
