// Shared domain types for DiscipleShip International.

export type Role = "super_admin" | "owner" | "leader";

export type QuestionType =
    | "short_text"
    | "long_text"
    | "single_choice"
    | "multi_choice"
    | "scale";

/** A question as authored in the survey builder. */
export interface SurveyQuestion {
    id: string;
    prompt: string;
    helpText?: string;
    type: QuestionType;
    required: boolean;
    /** For single_choice / multi_choice. */
    options?: string[];
    /** For scale. */
    scaleMin?: number;
    scaleMax?: number;
    scaleMinLabel?: string;
    scaleMaxLabel?: string;
    /**
     * Free-text questions with this set are clustered into themes by the AI
     * analysis. Choice/scale questions are tallied directly and ignore this.
     */
    aiCategorize: boolean;
    /**
     * Questions sharing a themeGroup are clustered into ONE theme taxonomy.
     * Use it for a repeated prompt ("Top Stressor 1/2/3") so the three columns
     * produce a single set of themes instead of three unrelated ones.
     * Defaults to the question's own id.
     */
    themeGroup?: string;
    /**
     * Marks a question as a segment (demographic) dimension, e.g. age group.
     * Segment questions drive the "theme by segment" cross-tabs.
     */
    isSegment?: boolean;
}

export type SurveyStatus = "draft" | "published" | "closed";

/**
 * church_analysis — the fixed template we run AI analysis on.
 * custom          — a church's own questions; collected and exported, never analyzed.
 * imported        — a spreadsheet of past responses, loaded so it can be analyzed.
 * Surveys created before kinds existed have none and are treated as analyzable.
 */
export type SurveyKind = "church_analysis" | "custom" | "imported";

export interface Survey {
    id: string;
    churchId: string;
    title: string;
    description?: string;
    kind?: SurveyKind;
    questions: SurveyQuestion[];
    status: SurveyStatus;
    /** Public URL token: /s/{publicSlug} */
    publicSlug: string;
    responseCount: number;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
    closedAt?: string | null;
    createdBy: string;
    /** Id of the most recent completed analysis, if any. */
    latestAnalysisId?: string | null;
}

export type AnswerValue = string | string[] | number;

export interface SurveyResponse {
    id: string;
    surveyId: string;
    churchId: string;
    submittedAt: string;
    /** questionId -> answer */
    answers: Record<string, AnswerValue>;
}

/** A theme discovered by the AI across a set of free-text answers. */
export interface Theme {
    id: string;
    label: string;
    description: string;
    /** Which question ids contributed answers to this theme. */
    questionIds: string[];
    count: number;
    /** Representative verbatim answers, for the "in their words" panel. */
    examples: string[];
    /**
     * The theme group it was clustered in, e.g. "stressors" or "questions", and
     * how to title that group. Absent on analyses run before groups were kept.
     */
    groupKey?: string;
    groupLabel?: string;
}

export interface ThemeAssignment {
    responseId: string;
    questionId: string;
    answerText: string;
    themeId: string;
    confidence: number;
}

/** Tally for a choice/scale question. */
export interface ChoiceBreakdown {
    questionId: string;
    prompt: string;
    type: QuestionType;
    counts: { label: string; count: number }[];
}

/** theme counts split by a segment question's answer, e.g. by age group. */
export interface SegmentBreakdown {
    segmentQuestionId: string;
    segmentPrompt: string;
    /** segment value -> themeId -> count */
    rows: { segment: string; total: number; themes: Record<string, number> }[];
}

export type AnalysisStatus = "running" | "complete" | "failed";

export interface Analysis {
    id: string;
    surveyId: string;
    churchId: string;
    status: AnalysisStatus;
    createdAt: string;
    completedAt?: string | null;
    createdBy: string;
    model: string;
    responseCount: number;
    creditsSpent: number;
    themes: Theme[];
    assignments: ThemeAssignment[];
    choiceBreakdowns: ChoiceBreakdown[];
    segmentBreakdowns: SegmentBreakdown[];
    /** Short narrative bullets for church leadership. */
    insights: string[];
    error?: string | null;
}

export interface Church {
    id: string;
    name: string;
    slug: string;
    contactEmail: string;
    city?: string;
    state?: string;
    credits: number;
    status: "active" | "suspended";
    createdAt: string;
    ownerUid: string;
    /** Paid add-ons switched on for this church; absent means "use the default". */
    modules?: ModuleEntitlements;
    /** Branding shown on public survey and booking pages. */
    logoUrl?: string | null;
    brandColor?: string | null;
    website?: string | null;
    /** Profile. sizeTier is an id from SIZE_TIERS in lib/churchProfile.ts and sets pricing. */
    denomination?: string | null;
    leadPastor?: string | null;
    phone?: string | null;
    sizeTier?: string | null;
    /** Set by a platform admin; the owner can no longer change the size. */
    sizeTierLocked?: boolean;
    /** Cleared once the owner finishes the guided product tour. */
    onboardedAt?: string | null;
    surveyCount?: number;
    responseCount?: number;
}

export interface AppUser {
    uid: string;
    email: string;
    name?: string;
    churchId: string | null;
    role: Role;
    createdAt: string;
}

export interface CreditTransaction {
    id: string;
    churchId: string;
    delta: number;
    balanceAfter: number;
    reason: string;
    actorUid: string;
    createdAt: string;
    /** Set when the transaction was spending on an analysis. */
    analysisId?: string | null;
}

/* ================================================================ modules === */

export type ModuleId =
    | "survey_analytics"
    | "sermon_builder"
    | "image_studio"
    | "tours";

/** Per-church switch for a paid module. */
export interface ModuleEntitlement {
    enabled: boolean;
    enabledAt?: string | null;
    /** Admin note explaining why it was turned on or off. */
    note?: string;
}

export type ModuleEntitlements = Partial<Record<ModuleId, ModuleEntitlement>>;

/* =================================================================== jobs === */

export type JobStatus = "queued" | "running" | "complete" | "failed" | "cancelled";

export interface JobProgress {
    step: number;
    total: number;
    message: string;
}

/**
 * Every unit of metered AI work is a job. One record carries authorization,
 * credit reservation, progress, result, and failure — so modules never
 * reimplement any of it.
 */
export interface Job<TInput = unknown, TResult = unknown> {
    id: string;
    churchId: string;
    moduleId: ModuleId;
    /** Discriminates handlers within a module, e.g. "sermon.series". */
    type: string;
    status: JobStatus;
    createdAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    /** Heartbeat, so the reaper can spot an abandoned run. */
    heartbeatAt?: string | null;
    createdBy: string;
    label: string;
    input: TInput;
    result?: TResult | null;
    error?: string | null;
    progress: JobProgress;
    creditsReserved: number;
    creditsSpent: number;
    refunded?: boolean;
}

/* ================================================================ sermons === */

export interface SermonPoint {
    heading: string;
    body: string;
    verses: string[];
}

export interface Sermon {
    id: string;
    churchId: string;
    seriesId?: string | null;
    /** Position within a series, 1-based. */
    weekNumber?: number | null;
    title: string;
    bigIdea: string;
    scripture: string[];
    audience: string;
    points: SermonPoint[];
    illustrations: string[];
    application: string[];
    closingPrayer: string;
    /** Survey theme this was generated from, when applicable. */
    sourceThemeLabel?: string | null;
    sourceSurveyId?: string | null;
    /** The three style options designed for this sermon's slides (free to preview). */
    slideStyles?: SlideStyle[] | null;
    /** The generated deck, if any. */
    slides?: SlideDeck | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

/* ================================================================= slides === */

/** Fonts a slide style may use: loaded in the browser, and common enough for PowerPoint. */
export type SlideFont = "Cormorant Garamond" | "Playfair Display" | "Lora" | "Inter" | "Montserrat" | "Oswald";

/** A visual direction for a deck. Applied at render time, so switching is free. */
export interface SlideStyle {
    id: string;
    name: string;
    /** One line on the feel, shown under the thumbnail. */
    mood: string;
    background: string;
    /** Second gradient stop; equal to background for a flat fill. */
    backgroundEnd: string;
    text: string;
    muted: string;
    accent: string;
    /** Second accent for glows and highlights in the motif. */
    accent2: string;
    headingFont: SlideFont;
    bodyFont: SlideFont;
    layout: "centered" | "left";
    /** The artwork behind the text (see lib/slideArt.ts). */
    motif: SlideMotif;
    /** Film-grain overlay. */
    texture: boolean;
    headingCase: "normal" | "upper";
}

export type SlideMotif = "rays" | "arch" | "horizon" | "frame" | "contours" | "constellation" | "cross" | "split" | "none";

export type SlideKind = "title" | "big_idea" | "scripture" | "point" | "list" | "statement" | "closing";

export interface Slide {
    kind: SlideKind;
    heading?: string;
    body?: string;
    /** Scripture reference, e.g. "Matthew 24:6 (KJV)". */
    reference?: string;
    bullets?: string[];
    /** Point number, for "point" slides. */
    number?: number;
}

export interface SlideDeck {
    styleId: string;
    slides: Slide[];
    createdAt: string;
}

export interface SermonSeries {
    id: string;
    churchId: string;
    title: string;
    premise: string;
    weeks: number;
    sourceSurveyId?: string | null;
    sourceAnalysisId?: string | null;
    createdAt: string;
    createdBy: string;
}

/* ================================================================= images === */

export type ImagePurpose = "series_art" | "sermon_slide" | "social_post" | "flyer";

export interface GeneratedImage {
    id: string;
    churchId: string;
    purpose: ImagePurpose;
    prompt: string;
    revisedPrompt?: string | null;
    /** Firebase Storage download URL. */
    url: string;
    storagePath: string;
    size: string;
    createdAt: string;
    createdBy: string;
    sermonId?: string | null;
    seriesId?: string | null;
}

/* ================================================================== tours === */

export type TourKind = "guest_visit" | "mission_trip";

export type TourStopStatus = "planned" | "confirmed" | "cancelled";

export interface TourStop {
    id: string;
    /** Host church, venue, or campus name. */
    location: string;
    city?: string;
    country?: string;
    startDate: string;
    endDate?: string | null;
    hostName?: string;
    hostEmail?: string;
    notes?: string;
    status: TourStopStatus;
}

export interface Tour {
    id: string;
    churchId: string;
    kind: TourKind;
    title: string;
    description?: string;
    stops: TourStop[];
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

/** A bookable slot on a guest-visit tour. */
export interface VisitSlot {
    id: string;
    churchId: string;
    title: string;
    description?: string;
    startsAt: string;
    durationMinutes: number;
    capacity: number;
    booked: number;
    publicSlug: string;
    status: "open" | "closed";
    createdAt: string;
    createdBy: string;
}

export interface VisitBooking {
    id: string;
    slotId: string;
    churchId: string;
    name: string;
    email: string;
    phone?: string;
    partySize: number;
    notes?: string;
    createdAt: string;
}

/* ============================================================ team + audit === */

export interface Invite {
    id: string;
    churchId: string;
    email: string;
    role: Role;
    token: string;
    invitedBy: string;
    createdAt: string;
    acceptedAt?: string | null;
    expiresAt: string;
}

export interface AuditEvent {
    id: string;
    churchId: string | null;
    actorUid: string;
    actorEmail?: string | null;
    action: string;
    target?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
