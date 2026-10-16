import { HttpError } from "./session";
import { newId } from "./ids";
import type { AnswerValue, QuestionType, SurveyQuestion, TourStop } from "./types";

const QUESTION_TYPES: QuestionType[] = [
    "short_text",
    "long_text",
    "single_choice",
    "multi_choice",
    "scale",
];

export function str(value: unknown, field: string, opts: { max?: number; required?: boolean } = {}): string {
    const { max = 2000, required = true } = opts;
    const s = typeof value === "string" ? value.trim() : "";
    if (!s && required) throw new HttpError(400, `${field} is required.`);
    if (s.length > max) throw new HttpError(400, `${field} must be under ${max} characters.`);
    return s;
}

/** Normalizes and validates questions coming from the builder or importer. */
export function parseQuestions(input: unknown): SurveyQuestion[] {
    if (!Array.isArray(input) || input.length === 0) {
        throw new HttpError(400, "A survey needs at least one question.");
    }
    if (input.length > 100) throw new HttpError(400, "A survey can have at most 100 questions.");

    return input.map((raw, i) => {
        const q = (raw ?? {}) as Partial<SurveyQuestion>;
        const type = q.type as QuestionType;
        if (!QUESTION_TYPES.includes(type)) {
            throw new HttpError(400, `Question ${i + 1} has an unknown type "${q.type}".`);
        }
        const prompt = str(q.prompt, `Question ${i + 1} text`, { max: 500 });

        const options = (q.options ?? [])
            .map((o) => String(o).trim())
            .filter(Boolean)
            .slice(0, 50);
        if ((type === "single_choice" || type === "multi_choice") && options.length < 2) {
            throw new HttpError(400, `Question ${i + 1} needs at least two options.`);
        }

        const isFreeText = type === "short_text" || type === "long_text";
        const scaleMin = Number(q.scaleMin ?? 1);
        const scaleMax = Number(q.scaleMax ?? 5);
        if (type === "scale" && !(scaleMax > scaleMin)) {
            throw new HttpError(400, `Question ${i + 1} needs a scale maximum above its minimum.`);
        }

        return {
            id: typeof q.id === "string" && q.id ? q.id : newId(),
            prompt,
            helpText: typeof q.helpText === "string" ? q.helpText.trim().slice(0, 500) : "",
            type,
            required: Boolean(q.required),
            options: type === "single_choice" || type === "multi_choice" ? options : [],
            scaleMin: type === "scale" ? scaleMin : undefined,
            scaleMax: type === "scale" ? scaleMax : undefined,
            scaleMinLabel: type === "scale" ? String(q.scaleMinLabel ?? "").slice(0, 60) : undefined,
            scaleMaxLabel: type === "scale" ? String(q.scaleMaxLabel ?? "").slice(0, 60) : undefined,
            aiCategorize: isFreeText ? q.aiCategorize !== false : false,
            themeGroup: typeof q.themeGroup === "string" && q.themeGroup.trim() ? q.themeGroup.trim() : undefined,
            isSegment: Boolean(q.isSegment) && (type === "single_choice" || type === "scale"),
        } satisfies SurveyQuestion;
    });
}

/**
 * Validates a public submission against the survey definition and drops
 * anything that doesn't correspond to a real question.
 */
export function parseAnswers(
    questions: SurveyQuestion[],
    input: unknown
): Record<string, AnswerValue> {
    const raw = (input ?? {}) as Record<string, unknown>;
    const answers: Record<string, AnswerValue> = {};

    for (const q of questions) {
        const value = raw[q.id];
        const missing =
            value == null ||
            value === "" ||
            (Array.isArray(value) && value.length === 0);

        if (missing) {
            if (q.required) throw new HttpError(400, `"${q.prompt}" is required.`);
            continue;
        }

        switch (q.type) {
            case "short_text":
            case "long_text": {
                const s = String(value).trim().slice(0, q.type === "short_text" ? 500 : 5000);
                if (s) answers[q.id] = s;
                break;
            }
            case "single_choice": {
                const s = String(value).trim();
                if (!q.options?.includes(s)) {
                    throw new HttpError(400, `"${s}" is not an option for "${q.prompt}".`);
                }
                answers[q.id] = s;
                break;
            }
            case "multi_choice": {
                const list = (Array.isArray(value) ? value : [value]).map((v) => String(v).trim());
                for (const v of list) {
                    if (!q.options?.includes(v)) {
                        throw new HttpError(400, `"${v}" is not an option for "${q.prompt}".`);
                    }
                }
                answers[q.id] = list;
                break;
            }
            case "scale": {
                const n = Number(value);
                const min = q.scaleMin ?? 1;
                const max = q.scaleMax ?? 5;
                if (!Number.isFinite(n) || n < min || n > max) {
                    throw new HttpError(400, `"${q.prompt}" must be between ${min} and ${max}.`);
                }
                answers[q.id] = n;
                break;
            }
        }
    }

    if (Object.keys(answers).length === 0) {
        throw new HttpError(400, "Please answer at least one question.");
    }
    return answers;
}

/** Validates the stop list on a mission-trip or guest-visit tour. */
export function parseStops(input: unknown): TourStop[] {
    if (!Array.isArray(input)) return [];
    if (input.length > 100) throw new HttpError(400, "A tour can have at most 100 stops.");

    return input.map((raw, i) => {
        const s = (raw ?? {}) as Partial<TourStop>;
        const startDate = str(s.startDate, `Stop ${i + 1} start date`, { max: 40 });
        const endDate = str(s.endDate, `Stop ${i + 1} end date`, { max: 40, required: false });
        if (endDate && endDate < startDate) {
            throw new HttpError(400, `Stop ${i + 1} ends before it starts.`);
        }
        const status = ["planned", "confirmed", "cancelled"].includes(String(s.status))
            ? (s.status as TourStop["status"])
            : "planned";

        return {
            id: typeof s.id === "string" && s.id ? s.id : newId(),
            location: str(s.location, `Stop ${i + 1} location`, { max: 200 }),
            city: str(s.city, "City", { max: 120, required: false }),
            country: str(s.country, "Country", { max: 120, required: false }),
            startDate,
            endDate: endDate || null,
            hostName: str(s.hostName, "Host", { max: 200, required: false }),
            hostEmail: str(s.hostEmail, "Host email", { max: 200, required: false }),
            notes: str(s.notes, "Notes", { max: 2000, required: false }),
            status,
        } satisfies TourStop;
    });
}
