import { NextRequest } from "next/server";
import { addResponses, createSurvey, updateSurvey } from "@/lib/db";
import { handle, HttpError, requireChurchActor } from "@/lib/session";
import { parseQuestions, str } from "@/lib/validate";
import type { AnswerValue, SurveyQuestion } from "@/lib/types";

const MAX_ROWS = 5000;

interface ColumnSpec {
    header: string;
    include: boolean;
    type: SurveyQuestion["type"];
    aiCategorize?: boolean;
    isSegment?: boolean;
    themeGroup?: string;
}

/**
 * Creates a survey from an existing spreadsheet (e.g. a Google Forms export)
 * and loads its rows as responses, so a church can analyze data it already has.
 * The client parses the workbook and posts headers + rows.
 */
export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        const body = await req.json();

        const title = str(body.title, "Survey title", { max: 200 });
        const description = str(body.description, "Description", { max: 2000, required: false });
        const columns = body.columns as ColumnSpec[];
        const rows = body.rows as unknown[][];

        if (!Array.isArray(columns) || !columns.length) {
            throw new HttpError(400, "No columns were provided.");
        }
        if (!Array.isArray(rows)) throw new HttpError(400, "No rows were provided.");
        if (rows.length > MAX_ROWS) {
            throw new HttpError(400, `That file has ${rows.length} rows; the limit is ${MAX_ROWS}.`);
        }

        const included = columns
            .map((c, index) => ({ ...c, index }))
            .filter((c) => c.include && String(c.header ?? "").trim());
        if (!included.length) throw new HttpError(400, "Select at least one column to import.");

        // Choice questions need their option list; derive it from the data.
        const draft = included.map((c) => {
            const isChoice = c.type === "single_choice" || c.type === "multi_choice";
            const options = isChoice
                ? [...new Set(rows.map((r) => String(r[c.index] ?? "").trim()).filter(Boolean))].slice(0, 50)
                : [];
            if (isChoice && options.length < 2) {
                // Not actually categorical — treat as free text rather than failing.
                return { spec: { ...c, type: "short_text" as const }, options: [] };
            }
            return { spec: c, options };
        });

        const questions = parseQuestions(
            draft.map((d) => ({
                prompt: d.spec.header,
                type: d.spec.type,
                required: false,
                options: d.options,
                aiCategorize: d.spec.aiCategorize !== false,
                isSegment: d.spec.isSegment,
                themeGroup: d.spec.themeGroup,
            }))
        );

        const survey = await createSurvey({
            churchId: actor.churchId,
            createdBy: actor.uid,
            kind: "imported",
            title,
            description,
            questions,
        });

        const payload: Record<string, AnswerValue>[] = [];
        for (const row of rows) {
            const answers: Record<string, AnswerValue> = {};
            included.forEach((c, qi) => {
                const q = questions[qi];
                const value = String(row[c.index] ?? "").trim();
                if (!value) return;
                if (q.type === "scale") {
                    const n = Number(value);
                    if (Number.isFinite(n)) answers[q.id] = n;
                    return;
                }
                if (q.type === "single_choice" && !q.options?.includes(value)) return;
                answers[q.id] = value;
            });
            if (Object.keys(answers).length) payload.push(answers);
        }

        const imported = await addResponses(survey.id, actor.churchId, payload);
        // Imported rows are historical, so the survey lands closed, not collecting.
        await updateSurvey(survey.id, { status: "closed", closedAt: new Date().toISOString() });

        return {
            survey: { ...survey, status: "closed", responseCount: imported },
            imported,
            skipped: rows.length - imported,
        };
    });
}
