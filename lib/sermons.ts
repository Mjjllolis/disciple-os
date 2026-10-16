import { AI_MODEL, generateJson } from "./ai";
import type { Sermon, SermonPoint } from "./types";

export const SERMON_MODEL = AI_MODEL;

const SYSTEM =
    "You write sermon preparation material for a local church teaching team. " +
    "You are theologically careful, pastoral, and practical. You cite Scripture " +
    "by book chapter:verse and never invent a reference or misquote one. " +
    "You give the preacher structure and raw material, not a script to read aloud.";

export interface SermonRequest {
    /** What the sermon is about — a survey theme label, or a free-text topic. */
    topic: string;
    /** Extra colour: theme description, or verbatim congregation answers. */
    context?: string;
    audience: string;
    /** e.g. "Sunday morning, 30 minutes". */
    setting?: string;
    /** Preacher's preferred passage, if they already have one. */
    scriptureHint?: string;
    seriesTitle?: string;
    weekNumber?: number;
    seriesPremise?: string;
}

interface RawSermon {
    title?: string;
    bigIdea?: string;
    scripture?: string[];
    points?: { heading?: string; body?: string; verses?: string[] }[];
    illustrations?: string[];
    application?: string[];
    closingPrayer?: string;
}

function normalize(raw: RawSermon, req: SermonRequest): Omit<Sermon, "id" | "churchId" | "createdAt" | "updatedAt" | "createdBy"> {
    const points: SermonPoint[] = (raw.points ?? [])
        .filter((p) => p?.heading?.trim())
        .map((p) => ({
            heading: p.heading!.trim(),
            body: (p.body ?? "").trim(),
            verses: (p.verses ?? []).map((v) => String(v).trim()).filter(Boolean),
        }));

    return {
        title: raw.title?.trim() || req.topic,
        bigIdea: raw.bigIdea?.trim() || "",
        scripture: (raw.scripture ?? []).map((s) => String(s).trim()).filter(Boolean),
        audience: req.audience,
        points,
        illustrations: (raw.illustrations ?? []).map((s) => String(s).trim()).filter(Boolean),
        application: (raw.application ?? []).map((s) => String(s).trim()).filter(Boolean),
        closingPrayer: raw.closingPrayer?.trim() || "",
        seriesId: null,
        weekNumber: req.weekNumber ?? null,
        sourceThemeLabel: null,
        sourceSurveyId: null,
    };
}

/** Generates one sermon outline. */
export async function generateSermon(req: SermonRequest) {
    const seriesLine = req.seriesTitle
        ? `This is week ${req.weekNumber ?? 1} of a series called "${req.seriesTitle}"` +
          (req.seriesPremise ? ` — ${req.seriesPremise}. ` : ". ") +
          "Make it stand on its own while clearly belonging to the series.\n"
        : "";

    const res = await generateJson<Record<string, unknown>>({
        effort: "medium",
        system: SYSTEM,
        prompt:
            `Prepare a sermon on: ${req.topic}\n` +
                (req.context ? `\nWhat the congregation actually said about this:\n${req.context}\n` : "") +
                `\nAudience: ${req.audience}\n` +
                (req.setting ? `Setting: ${req.setting}\n` : "") +
                (req.scriptureHint ? `Preferred passage: ${req.scriptureHint}\n` : "") +
                seriesLine +
                `\nReturn JSON with this exact shape:\n` +
                `{"title":"...","bigIdea":"one sentence the congregation should remember",` +
                `"scripture":["Primary passage","Supporting passage"],` +
                `"points":[{"heading":"...","body":"2-4 sentences of substance for the preacher",` +
                `"verses":["Book 1:1"]}],` +
                `"illustrations":["a concrete, everyday illustration"],` +
                `"application":["a specific step someone could take this week"],` +
                `"closingPrayer":"3-4 sentences"}\n\n` +
                `Give 3 or 4 points, 2 illustrations, and 3 application steps.`,
        fallback: {},
    });

    const raw = res as RawSermon;
    const sermon = normalize(raw, req);
    if (!sermon.points.length) {
        throw new Error("The model did not return a usable sermon outline. Please try again.");
    }
    return sermon;
}

export interface SeriesPlan {
    title: string;
    premise: string;
    weeks: { topic: string; angle: string }[];
}

/** Plans a multi-week series, usually from the top themes in a survey. */
export async function planSeries(input: {
    /** group: e.g. "Life challenges" or "Questions to teach on", when known. */
    themes: { label: string; description: string; count: number; group?: string }[];
    weeks: number;
    audience: string;
    context?: string;
}): Promise<SeriesPlan> {
    const themeLines = input.themes
        .slice(0, 15)
        .map((t) => `- ${t.group ? `[${t.group}] ` : ""}${t.label} (${t.count} mentions): ${t.description}`)
        .join("\n");
    const grouped = input.themes.some((t) => t.group);

    const res = await generateJson<Record<string, unknown>>({
        effort: "medium",
        system: SYSTEM,
        prompt:
            `A congregation survey surfaced these themes, ordered by how often they came up:\n\n` +
                `${themeLines}\n\n` +
                (input.context ? `${input.context}\n\n` : "") +
                `Design a ${input.weeks}-week teaching series for ${input.audience} that speaks to ` +
                `what these people actually said. Weight the series toward the themes mentioned most, ` +
                `but build a coherent arc rather than just ranking the list.\n` +
                (grouped
                    ? `Life challenges are what people are carrying; questions to teach on are what they asked to ` +
                      `learn. Answer the questions while speaking to the challenges.\n`
                    : "") +
                `\n` +
                `Return JSON: {"title":"series title","premise":"2 sentences on the arc",` +
                `"weeks":[{"topic":"week topic","angle":"what this week does that the others don't"}]}`,
        fallback: {},
    });

    const parsed = res as Partial<SeriesPlan>;
    const weeks = (parsed.weeks ?? [])
        .filter((w) => w?.topic?.trim())
        .map((w) => ({ topic: w.topic!.trim(), angle: (w.angle ?? "").trim() }))
        .slice(0, input.weeks);

    if (!weeks.length) throw new Error("The model did not return a usable series plan. Please try again.");

    return {
        title: parsed.title?.trim() || "Untitled Series",
        premise: parsed.premise?.trim() || "",
        weeks,
    };
}
