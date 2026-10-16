import type { Survey, SurveyKind, SurveyQuestion } from "./types";

/**
 * The Church Analysis survey: the fixed instrument our AI analysis is built
 * around. Churches can retitle it but not change the questions, so every
 * analysis compares like with like.
 *
 * Plain data with no ids, so the new-survey page can preview it; the server
 * assigns ids when it creates the survey.
 */
export type TemplateQuestion = Omit<SurveyQuestion, "id">;

export const AGE_GROUPS = ["ADULT (18 or older)", "YOUTH (under 18)"];

// The three stressors are interchangeable, as are the three questions: same
// description, all required, pooled into one theme set in the analysis.
const STRESSOR_HELP = "Something weighing on you right now: family, finances, work, health, relationships, faith. Anything counts.";
const QUESTION_HELP = "A question about God, the Bible, or the Christian life you'd like your church to teach on.";

const stressor = (n: number): TemplateQuestion => ({
    prompt: `Top Stressor ${n}`,
    helpText: STRESSOR_HELP,
    type: "short_text",
    required: true,
    options: [],
    aiCategorize: true,
    // One theme group across all three, so they yield a single stressor taxonomy.
    themeGroup: "stressors",
});

const question = (ordinal: string): TemplateQuestion => ({
    prompt: `${ordinal} Question`,
    helpText: QUESTION_HELP,
    type: "long_text",
    required: true,
    options: [],
    aiCategorize: true,
    themeGroup: "questions",
});

export const CHURCH_ANALYSIS_TEMPLATE = {
    defaultTitle: () => `Church Analysis ${new Date().getFullYear()}`,
    description:
        "This survey is completely anonymous. Tell us what's weighing on you and what you'd like taught, " +
        "so we can serve you better. It takes about three minutes.",
    questions: [
        {
            prompt: "What is your age group?",
            helpText: "",
            type: "single_choice",
            required: true,
            options: AGE_GROUPS,
            aiCategorize: false,
            isSegment: true,
        },
        stressor(1),
        stressor(2),
        stressor(3),
        question("1st"),
        question("2nd"),
        question("3rd"),
    ] satisfies TemplateQuestion[],
};

/**
 * How the analysis frames each Church Analysis theme group. Stressors and
 * questions are different kinds of answer and are never mixed: stressors are
 * the life challenges people are carrying, questions are what they want taught.
 */
export interface GroupProfile {
    /** Section title on the results page. */
    title: string;
    /** One line under the title. */
    subtitle: string;
    /** What the AI is told this group of answers is and how to name its themes. */
    guidance: string;
}

export const GROUP_PROFILES: Record<string, GroupProfile> = {
    stressors: {
        title: "Life challenges",
        subtitle: "What people are carrying right now: the stressors they named.",
        guidance:
            "These answers are life challenges: the stressors and pressures people are carrying in daily life " +
            "(finances, family, marriage, parenting, health, work, relationships, loneliness, spiritual struggles). " +
            "Name each theme as a life challenge, e.g. \"Financial Strain\", \"Family Members' Salvation\", " +
            "\"Marriage Tension\", \"Work-Life Balance\". Do not turn them into doctrinal or Bible-study topics.",
    },
    questions: {
        title: "Questions to teach on",
        subtitle: "What people want taught: questions about God, the Bible, and faith.",
        guidance:
            "These answers are questions people want their church to teach on. Categorize them by teaching topic, " +
            "naming the subject being asked about, e.g. \"End Times & Prophecy\", \"Denominations & Catholicism\", " +
            "\"Assurance of Salvation\", \"Reliability of the Bible\", \"Prayer\". Do not name themes after feelings " +
            "or life circumstances; those belong to a different section.",
    },
};

/**
 * The profile for a theme group. Matches by name so imported spreadsheets
 * (whose repeated columns group as e.g. "top stressor" and "question") get the
 * same treatment as the template.
 */
export function groupProfile(groupKey: string | undefined): GroupProfile | undefined {
    if (!groupKey) return undefined;
    if (/stress|challenge|struggle/i.test(groupKey)) return GROUP_PROFILES.stressors;
    if (/question/i.test(groupKey)) return GROUP_PROFILES.questions;
    return undefined;
}

export const SURVEY_KIND_LABEL: Record<SurveyKind, string> = {
    church_analysis: "Church Analysis",
    custom: "Custom",
    imported: "Imported",
};

/** Custom surveys collect and export responses but are never analyzed. */
export function canAnalyze(survey: Pick<Survey, "kind">): boolean {
    return survey.kind !== "custom";
}
