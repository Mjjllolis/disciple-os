import { FieldValue } from "firebase-admin/firestore";
import { adminDb, COL } from "./firebaseAdmin";
import { newId, publicToken, slugify } from "./ids";
import type {
    Analysis,
    AppUser,
    Church,
    CreditTransaction,
    GeneratedImage,
    Invite,
    ModuleEntitlement,
    ModuleId,
    SurveyKind,
    Role,
    Sermon,
    SermonSeries,
    Survey,
    SurveyResponse,
    Tour,
    VisitBooking,
    VisitSlot,
} from "./types";

/**
 * Every read/write here is trusted server-side code. Callers are responsible
 * for having already authorized the actor via lib/session.ts guards.
 */

function iso(): string {
    return new Date().toISOString();
}

/* ---------------------------------------------------------------- users --- */

export async function getUser(uid: string): Promise<AppUser | null> {
    const snap = await adminDb().collection(COL.users).doc(uid).get();
    return snap.exists ? ({ uid, ...snap.data() } as AppUser) : null;
}

export async function createUser(input: {
    uid: string;
    email: string;
    name?: string;
    churchId: string | null;
    role: Role;
}): Promise<AppUser> {
    const user: AppUser = {
        uid: input.uid,
        email: input.email.toLowerCase(),
        name: input.name,
        churchId: input.churchId,
        role: input.role,
        createdAt: iso(),
    };
    const { uid, ...rest } = user;
    await adminDb().collection(COL.users).doc(uid).set(rest);
    return user;
}

/* -------------------------------------------------------------- churches --- */

export async function getChurch(churchId: string): Promise<Church | null> {
    const snap = await adminDb().collection(COL.churches).doc(churchId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as Church) : null;
}

export async function listChurches(): Promise<Church[]> {
    const snap = await adminDb().collection(COL.churches).orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Church);
}

/** Creates the church and its owner user in one batch. */
export async function createChurchWithOwner(input: {
    churchName: string;
    contactEmail: string;
    city?: string;
    state?: string;
    ownerUid: string;
    ownerName?: string;
    startingCredits: number;
}): Promise<Church> {
    const db = adminDb();
    const churchRef = db.collection(COL.churches).doc();
    const church: Omit<Church, "id"> = {
        name: input.churchName,
        slug: slugify(input.churchName) || churchRef.id.slice(0, 8),
        contactEmail: input.contactEmail.toLowerCase(),
        city: input.city,
        state: input.state,
        credits: input.startingCredits,
        status: "active",
        createdAt: iso(),
        ownerUid: input.ownerUid,
    };

    const batch = db.batch();
    batch.set(churchRef, church);
    batch.set(db.collection(COL.users).doc(input.ownerUid), {
        email: input.contactEmail.toLowerCase(),
        name: input.ownerName,
        churchId: churchRef.id,
        role: "owner" as Role,
        createdAt: iso(),
    });
    if (input.startingCredits > 0) {
        batch.set(churchRef.collection(COL.creditTransactions).doc(), {
            churchId: churchRef.id,
            delta: input.startingCredits,
            balanceAfter: input.startingCredits,
            reason: "Welcome credits",
            actorUid: "system",
            createdAt: iso(),
        });
    }
    await batch.commit();

    return { id: churchRef.id, ...church };
}

export async function setChurchStatus(churchId: string, status: Church["status"]): Promise<void> {
    await adminDb().collection(COL.churches).doc(churchId).update({ status });
}

/* --------------------------------------------------------------- credits --- */

export class InsufficientCreditsError extends Error {
    constructor(public required: number, public available: number) {
        super(`This analysis needs ${required} credits but the church has ${available}.`);
        this.name = "InsufficientCreditsError";
    }
}

/**
 * Atomically moves a church's credit balance and writes a ledger entry.
 * `delta` is negative to spend. Throws InsufficientCreditsError rather than
 * letting a balance go negative.
 */
export async function adjustCredits(input: {
    churchId: string;
    delta: number;
    reason: string;
    actorUid: string;
    analysisId?: string | null;
}): Promise<number> {
    const db = adminDb();
    const churchRef = db.collection(COL.churches).doc(input.churchId);

    return db.runTransaction(async (tx) => {
        const snap = await tx.get(churchRef);
        if (!snap.exists) throw new Error("Church not found");
        const current = Number(snap.data()?.credits ?? 0);
        const next = current + input.delta;
        if (next < 0) throw new InsufficientCreditsError(Math.abs(input.delta), current);

        tx.update(churchRef, { credits: next });
        tx.set(churchRef.collection(COL.creditTransactions).doc(), {
            churchId: input.churchId,
            delta: input.delta,
            balanceAfter: next,
            reason: input.reason,
            actorUid: input.actorUid,
            analysisId: input.analysisId ?? null,
            createdAt: iso(),
        });
        return next;
    });
}

export async function listCreditTransactions(
    churchId: string,
    limit = 50
): Promise<CreditTransaction[]> {
    const snap = await adminDb()
        .collection(COL.churches)
        .doc(churchId)
        .collection(COL.creditTransactions)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CreditTransaction);
}

/* --------------------------------------------------------------- surveys --- */

export async function createSurvey(input: {
    churchId: string;
    createdBy: string;
    title: string;
    description?: string;
    kind: SurveyKind;
    questions: Survey["questions"];
}): Promise<Survey> {
    const db = adminDb();
    const ref = db.collection(COL.surveys).doc();
    const survey: Omit<Survey, "id"> = {
        churchId: input.churchId,
        title: input.title,
        description: input.description ?? "",
        kind: input.kind,
        questions: input.questions,
        status: "draft",
        publicSlug: publicToken(),
        responseCount: 0,
        createdAt: iso(),
        updatedAt: iso(),
        publishedAt: null,
        closedAt: null,
        createdBy: input.createdBy,
        latestAnalysisId: null,
    };
    await ref.set(survey);
    return { id: ref.id, ...survey };
}

export async function getSurvey(surveyId: string): Promise<Survey | null> {
    const snap = await adminDb().collection(COL.surveys).doc(surveyId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as Survey) : null;
}

export async function getSurveyByPublicSlug(slug: string): Promise<Survey | null> {
    const snap = await adminDb()
        .collection(COL.surveys)
        .where("publicSlug", "==", slug)
        .limit(1)
        .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Survey;
}

export async function listSurveysForChurch(churchId: string): Promise<Survey[]> {
    const snap = await adminDb()
        .collection(COL.surveys)
        .where("churchId", "==", churchId)
        .get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Survey)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllSurveys(): Promise<Survey[]> {
    const snap = await adminDb().collection(COL.surveys).orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Survey);
}

export async function updateSurvey(
    surveyId: string,
    patch: Partial<Omit<Survey, "id" | "churchId">>
): Promise<void> {
    await adminDb()
        .collection(COL.surveys)
        .doc(surveyId)
        .update({ ...patch, updatedAt: iso() });
}

export async function deleteSurvey(surveyId: string): Promise<void> {
    const db = adminDb();
    const ref = db.collection(COL.surveys).doc(surveyId);
    for (const sub of [COL.responses, COL.analyses]) {
        const docs = await ref.collection(sub).listDocuments();
        while (docs.length) {
            const batch = db.batch();
            docs.splice(0, 400).forEach((d) => batch.delete(d));
            await batch.commit();
        }
    }
    await ref.delete();
}

/* ------------------------------------------------------------- responses --- */

export async function addResponse(input: {
    surveyId: string;
    churchId: string;
    answers: SurveyResponse["answers"];
}): Promise<SurveyResponse> {
    const db = adminDb();
    const surveyRef = db.collection(COL.surveys).doc(input.surveyId);
    const responseRef = surveyRef.collection(COL.responses).doc();
    const response: Omit<SurveyResponse, "id"> = {
        surveyId: input.surveyId,
        churchId: input.churchId,
        submittedAt: iso(),
        answers: input.answers,
    };

    const batch = db.batch();
    batch.set(responseRef, response);
    batch.update(surveyRef, { responseCount: FieldValue.increment(1), updatedAt: iso() });
    await batch.commit();

    return { id: responseRef.id, ...response };
}

/** Bulk insert, used by the spreadsheet importer. */
export async function addResponses(
    surveyId: string,
    churchId: string,
    rows: SurveyResponse["answers"][]
): Promise<number> {
    const db = adminDb();
    const surveyRef = db.collection(COL.surveys).doc(surveyId);
    let written = 0;

    for (let i = 0; i < rows.length; i += 400) {
        const chunk = rows.slice(i, i + 400);
        const batch = db.batch();
        for (const answers of chunk) {
            batch.set(surveyRef.collection(COL.responses).doc(), {
                surveyId,
                churchId,
                submittedAt: iso(),
                answers,
            });
        }
        await batch.commit();
        written += chunk.length;
    }

    if (written) {
        await surveyRef.update({ responseCount: FieldValue.increment(written), updatedAt: iso() });
    }
    return written;
}

export async function listResponses(surveyId: string): Promise<SurveyResponse[]> {
    const snap = await adminDb()
        .collection(COL.surveys)
        .doc(surveyId)
        .collection(COL.responses)
        .get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as SurveyResponse)
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

/* -------------------------------------------------------------- analyses --- */

export async function saveAnalysis(analysis: Omit<Analysis, "id"> & { id?: string }): Promise<Analysis> {
    const db = adminDb();
    const id = analysis.id ?? newId();
    const body = { ...analysis } as Partial<Analysis>;
    delete body.id;
    await db
        .collection(COL.surveys)
        .doc(analysis.surveyId)
        .collection(COL.analyses)
        .doc(id)
        .set(body);
    return { ...(body as Omit<Analysis, "id">), id };
}

export async function getAnalysis(surveyId: string, analysisId: string): Promise<Analysis | null> {
    const snap = await adminDb()
        .collection(COL.surveys)
        .doc(surveyId)
        .collection(COL.analyses)
        .doc(analysisId)
        .get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as Analysis) : null;
}

export async function listAnalyses(surveyId: string): Promise<Analysis[]> {
    const snap = await adminDb()
        .collection(COL.surveys)
        .doc(surveyId)
        .collection(COL.analyses)
        .get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Analysis)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ---------------------------------------------------------- church admin --- */

export async function updateChurch(
    churchId: string,
    patch: Partial<
        Pick<
            Church,
            | "name"
            | "city"
            | "state"
            | "website"
            | "logoUrl"
            | "brandColor"
            | "onboardedAt"
            | "contactEmail"
            | "denomination"
            | "leadPastor"
            | "phone"
            | "sizeTier"
            | "sizeTierLocked"
        >
    >
): Promise<void> {
    await adminDb().collection(COL.churches).doc(churchId).update(patch);
}

/** Turns a paid module on or off for one church. */
export async function setModuleEntitlement(
    churchId: string,
    moduleId: ModuleId,
    entitlement: ModuleEntitlement
): Promise<void> {
    await adminDb()
        .collection(COL.churches)
        .doc(churchId)
        .update({ [`modules.${moduleId}`]: entitlement });
}

/* ----------------------------------------------------------------- team --- */

export async function listMembers(churchId: string): Promise<AppUser[]> {
    const snap = await adminDb().collection(COL.users).where("churchId", "==", churchId).get();
    return snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }) as AppUser)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function setMemberRole(uid: string, role: Role): Promise<void> {
    await adminDb().collection(COL.users).doc(uid).update({ role });
}

export async function removeMember(uid: string): Promise<void> {
    // Detach rather than delete, so their audit trail keeps resolving.
    await adminDb().collection(COL.users).doc(uid).update({ churchId: null });
}

const INVITES = "invites";

export async function createInvite(input: {
    churchId: string;
    email: string;
    role: Role;
    invitedBy: string;
}): Promise<Invite> {
    const db = adminDb();
    const ref = db.collection(INVITES).doc();
    const invite: Omit<Invite, "id"> = {
        churchId: input.churchId,
        email: input.email.toLowerCase(),
        role: input.role,
        token: publicToken(24),
        invitedBy: input.invitedBy,
        createdAt: iso(),
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await ref.set(invite);
    return { id: ref.id, ...invite };
}

export async function listInvites(churchId: string): Promise<Invite[]> {
    const snap = await adminDb().collection(INVITES).where("churchId", "==", churchId).get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Invite)
        .filter((i) => !i.acceptedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
    const snap = await adminDb().collection(INVITES).where("token", "==", token).limit(1).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Invite;
}

export async function markInviteAccepted(inviteId: string): Promise<void> {
    await adminDb().collection(INVITES).doc(inviteId).update({ acceptedAt: iso() });
}

export async function revokeInvite(inviteId: string): Promise<void> {
    await adminDb().collection(INVITES).doc(inviteId).delete();
}

/* -------------------------------------------------------------- sermons --- */

const SERMONS = "sermons";
const SERIES = "sermonSeries";

export async function saveSermon(sermon: Omit<Sermon, "id"> & { id?: string }): Promise<Sermon> {
    const db = adminDb();
    const id = sermon.id ?? newId();
    const body = { ...sermon } as Partial<Sermon>;
    delete body.id;
    await db.collection(SERMONS).doc(id).set(body, { merge: true });
    return { ...(body as Omit<Sermon, "id">), id };
}

export async function getSermon(sermonId: string): Promise<Sermon | null> {
    const snap = await adminDb().collection(SERMONS).doc(sermonId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as Sermon) : null;
}

export async function listSermons(churchId: string): Promise<Sermon[]> {
    const snap = await adminDb().collection(SERMONS).where("churchId", "==", churchId).get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Sermon)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteSermon(sermonId: string): Promise<void> {
    await adminDb().collection(SERMONS).doc(sermonId).delete();
}

export async function saveSeries(series: Omit<SermonSeries, "id"> & { id?: string }): Promise<SermonSeries> {
    const id = series.id ?? newId();
    const body = { ...series } as Partial<SermonSeries>;
    delete body.id;
    await adminDb().collection(SERIES).doc(id).set(body, { merge: true });
    return { ...(body as Omit<SermonSeries, "id">), id };
}

export async function listSeries(churchId: string): Promise<SermonSeries[]> {
    const snap = await adminDb().collection(SERIES).where("churchId", "==", churchId).get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as SermonSeries)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSeries(seriesId: string): Promise<SermonSeries | null> {
    const snap = await adminDb().collection(SERIES).doc(seriesId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as SermonSeries) : null;
}

/* --------------------------------------------------------------- images --- */

const IMAGES = "images";

export async function saveImage(image: Omit<GeneratedImage, "id">): Promise<GeneratedImage> {
    const ref = adminDb().collection(IMAGES).doc();
    await ref.set(image);
    return { id: ref.id, ...image };
}

export async function listImages(churchId: string, limit = 100): Promise<GeneratedImage[]> {
    const snap = await adminDb().collection(IMAGES).where("churchId", "==", churchId).limit(limit * 2).get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as GeneratedImage)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
}

export async function getImage(imageId: string): Promise<GeneratedImage | null> {
    const snap = await adminDb().collection(IMAGES).doc(imageId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as GeneratedImage) : null;
}

export async function deleteImageRecord(imageId: string): Promise<void> {
    await adminDb().collection(IMAGES).doc(imageId).delete();
}

/* ---------------------------------------------------------------- tours --- */

const TOURS = "tours";
const SLOTS = "visitSlots";
const BOOKINGS = "visitBookings";

export async function saveTour(tour: Omit<Tour, "id"> & { id?: string }): Promise<Tour> {
    const id = tour.id ?? newId();
    const body = { ...tour } as Partial<Tour>;
    delete body.id;
    await adminDb().collection(TOURS).doc(id).set(body, { merge: true });
    return { ...(body as Omit<Tour, "id">), id };
}

export async function listTours(churchId: string): Promise<Tour[]> {
    const snap = await adminDb().collection(TOURS).where("churchId", "==", churchId).get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Tour)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTour(tourId: string): Promise<Tour | null> {
    const snap = await adminDb().collection(TOURS).doc(tourId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as Tour) : null;
}

export async function deleteTour(tourId: string): Promise<void> {
    await adminDb().collection(TOURS).doc(tourId).delete();
}

export async function saveVisitSlot(slot: Omit<VisitSlot, "id"> & { id?: string }): Promise<VisitSlot> {
    const id = slot.id ?? newId();
    const body = { ...slot } as Partial<VisitSlot>;
    delete body.id;
    await adminDb().collection(SLOTS).doc(id).set(body, { merge: true });
    return { ...(body as Omit<VisitSlot, "id">), id };
}

export async function listVisitSlots(churchId: string): Promise<VisitSlot[]> {
    const snap = await adminDb().collection(SLOTS).where("churchId", "==", churchId).get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as VisitSlot)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getVisitSlotBySlug(slug: string): Promise<VisitSlot | null> {
    const snap = await adminDb().collection(SLOTS).where("publicSlug", "==", slug).limit(1).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as VisitSlot;
}

export async function deleteVisitSlot(slotId: string): Promise<void> {
    await adminDb().collection(SLOTS).doc(slotId).delete();
}

export class SlotFullError extends Error {
    constructor() {
        super("That time is already full. Please choose another.");
        this.name = "SlotFullError";
    }
}

/**
 * Books a visit slot, refusing to oversell. The seat count and the booking are
 * written in one transaction so two people clicking at once can't both take
 * the last spot.
 */
export async function bookVisitSlot(input: {
    slotId: string;
    churchId: string;
    name: string;
    email: string;
    phone?: string;
    partySize: number;
    notes?: string;
}): Promise<VisitBooking> {
    const db = adminDb();
    const slotRef = db.collection(SLOTS).doc(input.slotId);
    const bookingRef = db.collection(BOOKINGS).doc();

    const booking: Omit<VisitBooking, "id"> = {
        slotId: input.slotId,
        churchId: input.churchId,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        partySize: input.partySize,
        notes: input.notes,
        createdAt: iso(),
    };

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(slotRef);
        if (!snap.exists) throw new Error("That visit time no longer exists.");
        const slot = snap.data() as VisitSlot;
        if (slot.status !== "open") throw new SlotFullError();
        if (slot.booked + input.partySize > slot.capacity) throw new SlotFullError();

        tx.update(slotRef, { booked: slot.booked + input.partySize });
        tx.set(bookingRef, booking);
    });

    return { id: bookingRef.id, ...booking };
}

export async function listBookings(churchId: string, slotId?: string): Promise<VisitBooking[]> {
    let query = adminDb().collection(BOOKINGS).where("churchId", "==", churchId);
    if (slotId) query = query.where("slotId", "==", slotId);
    const snap = await query.get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as VisitBooking)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
