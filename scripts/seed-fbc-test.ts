/**
 * Seeds "FBC Test", a demo church that walks the full paid flow:
 *
 *   owner logs in → survey with 64 real responses is waiting →
 *   run the AI analysis (spends credits) → build a sermon series from the
 *   themes (Sermon Builder add-on, spends credits) → buy more on /dashboard/billing.
 *
 * Responses come from samples/fbc-test-survey.csv, a Google Forms export. The
 * same file can also be loaded by hand through /dashboard/surveys/import.
 *
 *   npm run dev                # emulators + this seed + next dev, no cloud
 *   npm run seed:fbc-test            # create (skips the survey if it exists)
 *   npm run seed:fbc-test -- --reset # delete and re-create the survey
 *
 * Env: the Firebase Admin credentials from .env.local, plus optional
 * SEED_EMAIL / SEED_PASSWORD for the demo owner login.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { read, utils } from "xlsx";
import { adminAuth, adminDb, COL } from "../lib/firebaseAdmin";
import {
    createChurchWithOwner,
    createSurvey,
    deleteSurvey,
    getChurch,
    getUser,
    listSurveysForChurch,
    setModuleEntitlement,
    updateSurvey,
} from "../lib/db";
import { newId } from "../lib/ids";
import type { AnswerValue, SurveyQuestion } from "../lib/types";

const CHURCH_NAME = "FBC Test";
const SURVEY_TITLE = "Congregation Stressors & Questions";
const EMAIL = (process.env.SEED_EMAIL ?? "fbc-test@example.com").toLowerCase();
const PASSWORD = process.env.SEED_PASSWORD ?? "FbcTest2026!";
const STARTING_CREDITS = Number(process.env.WELCOME_CREDITS ?? 250);
const LOCAL_ADMIN = { email: "admin@example.com", password: "AdminTest2026!" };
const CSV_PATH =join(__dirname, "..", "samples", "fbc-test-survey.csv");

/** Column layout of the CSV, in order. Timestamp (column 0) becomes submittedAt. */
function buildQuestions(ageOptions: string[]): SurveyQuestion[] {
    const text = (prompt: string, themeGroup: string, type: "short_text" | "long_text"): SurveyQuestion => ({
        id: newId(),
        prompt,
        helpText: "",
        type,
        required: false,
        options: [],
        aiCategorize: true,
        themeGroup,
    });
    return [
        {
            id: newId(),
            prompt: "What is your age group?",
            helpText: "",
            type: "single_choice",
            required: true,
            options: ageOptions,
            aiCategorize: false,
            isSegment: true,
        },
        // One theme group per repeated prompt, so the three columns yield one
        // stressor taxonomy and one question taxonomy instead of six.
        text("Top Stressor 1", "stressors", "short_text"),
        text("Top Stressor 2", "stressors", "short_text"),
        text("Top Stressor 3", "stressors", "short_text"),
        text("1st Question", "questions", "long_text"),
        text("2nd Question", "questions", "long_text"),
        text("3rd Question", "questions", "long_text"),
    ];
}

/** "1/5/2025 9:37:38" → ISO string. */
function parseTimestamp(value: string): string {
    const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
    if (!m) throw new Error(`Unrecognized timestamp "${value}"`);
    const [, mo, d, y, h, mi, s] = m.map(Number);
    return new Date(y, mo - 1, d, h, mi, s).toISOString();
}

async function getOrCreateAuthUser(): Promise<string> {
    try {
        return (await adminAuth().getUserByEmail(EMAIL)).uid;
    } catch (err) {
        if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
        const user = await adminAuth().createUser({
            email: EMAIL,
            password: PASSWORD,
            displayName: "FBC Test Pastor",
        });
        console.log(`Created login ${EMAIL} / ${PASSWORD}`);
        return user.uid;
    }
}

/** Locally only: a platform admin login (`npm run dev` lists it in SUPER_ADMIN_EMAILS). */
async function ensureLocalAdmin() {
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) return;
    try {
        await adminAuth().getUserByEmail(LOCAL_ADMIN.email);
    } catch {
        await adminAuth().createUser({ ...LOCAL_ADMIN, displayName: "Platform Admin" });
        console.log(`Created admin login ${LOCAL_ADMIN.email} / ${LOCAL_ADMIN.password}`);
    }
}

async function main() {
    const reset = process.argv.includes("--reset");

    await ensureLocalAdmin();
    const uid = await getOrCreateAuthUser();
    const profile = await getUser(uid);
    let church = profile?.churchId ? await getChurch(profile.churchId) : null;
    if (!church) {
        church = await createChurchWithOwner({
            churchName: CHURCH_NAME,
            contactEmail: EMAIL,
            ownerUid: uid,
            ownerName: "FBC Test Pastor",
            startingCredits: STARTING_CREDITS,
        });
        console.log(`Created church "${church.name}" (${church.id}) with ${church.credits} credits`);
    } else {
        console.log(`Using existing church "${church.name}" (${church.id}), ${church.credits} credits`);
    }

    // The paid step after the survey: turn its themes into a sermon series.
    await setModuleEntitlement(church.id, "sermon_builder", {
        enabled: true,
        enabledAt: new Date().toISOString(),
        note: "Demo church (seed-fbc-test)",
    });

    const existing = (await listSurveysForChurch(church.id)).find((s) => s.title === SURVEY_TITLE);
    if (existing && !reset) {
        console.log(`Survey already seeded (${existing.id}); pass --reset to re-create it.`);
        return;
    }
    if (existing) {
        await deleteSurvey(existing.id);
        console.log(`Deleted previous survey ${existing.id}`);
    }

    // raw: keep cells as text so timestamps aren't reformatted as dates.
    const wb = read(readFileSync(CSV_PATH), { type: "buffer", raw: true });
    const grid = utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], {
        header: 1,
        defval: "",
        raw: false,
    });
    const rows = grid.slice(1).filter((r) => r.some((c) => String(c).trim()));
    const ageOptions = [...new Set(rows.map((r) => String(r[1]).trim()).filter(Boolean))];
    const questions = buildQuestions(ageOptions);

    const survey = await createSurvey({
        churchId: church.id,
        createdBy: uid,
        kind: "church_analysis",
        title: SURVEY_TITLE,
        description: "What's weighing on you, and what do you want taught? Imported from the FBC Google Form.",
        questions,
    });

    // Written directly rather than through addResponses() so each response
    // keeps its original submission time.
    const db = adminDb();
    const responsesRef = db.collection(COL.surveys).doc(survey.id).collection(COL.responses);
    const times: string[] = [];
    const batch = db.batch();
    for (const row of rows) {
        const answers: Record<string, AnswerValue> = {};
        questions.forEach((q, i) => {
            const value = String(row[i + 1] ?? "").trim();
            if (value) answers[q.id] = value;
        });
        const submittedAt = parseTimestamp(String(row[0]).trim());
        times.push(submittedAt);
        batch.set(responsesRef.doc(), { surveyId: survey.id, churchId: church.id, submittedAt, answers });
    }
    await batch.commit();

    times.sort();
    await updateSurvey(survey.id, {
        status: "closed",
        responseCount: rows.length,
        publishedAt: times[0],
        closedAt: times[times.length - 1],
    });

    console.log(`Seeded survey "${SURVEY_TITLE}" (${survey.id}) with ${rows.length} responses.`);
    console.log(`Log in as ${EMAIL} and open /dashboard/surveys/${survey.id}`);
}

main().then(
    () => process.exit(0),
    (err) => {
        console.error(err);
        process.exit(1);
    }
);
