import { listAllSurveys, listChurches } from "@/lib/db";
import { handle, requireSuperAdmin } from "@/lib/session";

/** Platform-wide roll-up: every church, with survey and response totals. */
export async function GET() {
    return handle(async () => {
        await requireSuperAdmin();
        const [churches, surveys] = await Promise.all([listChurches(), listAllSurveys()]);

        const byChurch = new Map<string, { surveys: number; responses: number }>();
        for (const s of surveys) {
            const row = byChurch.get(s.churchId) ?? { surveys: 0, responses: 0 };
            row.surveys += 1;
            row.responses += s.responseCount ?? 0;
            byChurch.set(s.churchId, row);
        }

        return {
            churches: churches.map((c) => ({
                ...c,
                surveyCount: byChurch.get(c.id)?.surveys ?? 0,
                responseCount: byChurch.get(c.id)?.responses ?? 0,
            })),
            totals: {
                churches: churches.length,
                surveys: surveys.length,
                responses: surveys.reduce((n, s) => n + (s.responseCount ?? 0), 0),
                credits: churches.reduce((n, c) => n + (c.credits ?? 0), 0),
            },
        };
    });
}
