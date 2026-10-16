import { adminDb } from "./firebaseAdmin";
import { adjustCredits, InsufficientCreditsError } from "./db";
import { HttpError } from "./session";
import type { Job, JobProgress, JobStatus, ModuleId } from "./types";

const JOBS = "jobs";

/** A run with no heartbeat for this long is presumed dead. */
const STALE_AFTER_MS = 10 * 60 * 1000;

function iso() {
    return new Date().toISOString();
}

function jobRef(jobId: string) {
    return adminDb().collection(JOBS).doc(jobId);
}

export async function getJob(jobId: string): Promise<Job | null> {
    const snap = await jobRef(jobId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Job;
}

export async function listJobs(churchId: string, limit = 50): Promise<Job[]> {
    const snap = await adminDb()
        .collection(JOBS)
        .where("churchId", "==", churchId)
        .limit(limit * 2)
        .get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Job)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
}

/** Handle passed to a job body so it can report progress as it works. */
export interface JobContext {
    jobId: string;
    churchId: string;
    actorUid: string;
    progress(step: number, total: number, message: string): Promise<void>;
}

/**
 * Runs a unit of metered work end to end:
 *
 *   1. claims the job id (rejecting a duplicate submit),
 *   2. reserves credits inside a Firestore transaction,
 *   3. executes `body`, streaming progress into the job document,
 *   4. records the result, or refunds and records the failure.
 *
 * The caller supplies `jobId` so the browser can start polling for progress
 * before this request finishes — no fire-and-forget work that a scaled-down
 * instance would silently drop.
 */
export async function runJob<TInput, TResult>(params: {
    jobId: string;
    churchId: string;
    moduleId: ModuleId;
    type: string;
    label: string;
    actorUid: string;
    input: TInput;
    credits: number;
    body: (ctx: JobContext) => Promise<TResult>;
}): Promise<Job<TInput, TResult>> {
    const ref = jobRef(params.jobId);

    // Claiming the id first makes a double-submit a 409 instead of a double charge.
    try {
        await ref.create({
            churchId: params.churchId,
            moduleId: params.moduleId,
            type: params.type,
            status: "queued" as JobStatus,
            createdAt: iso(),
            createdBy: params.actorUid,
            label: params.label,
            input: params.input,
            result: null,
            error: null,
            progress: { step: 0, total: 1, message: "Starting…" },
            creditsReserved: params.credits,
            creditsSpent: 0,
            refunded: false,
        });
    } catch {
        throw new HttpError(409, "That job was already submitted.");
    }

    if (params.credits > 0) {
        try {
            await adjustCredits({
                churchId: params.churchId,
                delta: -params.credits,
                reason: params.label,
                actorUid: params.actorUid,
            });
        } catch (err) {
            await ref.update({
                status: "failed" as JobStatus,
                error: err instanceof Error ? err.message : "Could not reserve credits.",
                completedAt: iso(),
            });
            if (err instanceof InsufficientCreditsError) throw new HttpError(402, err.message);
            throw err;
        }
    }

    await ref.update({ status: "running" as JobStatus, startedAt: iso(), heartbeatAt: iso() });

    const ctx: JobContext = {
        jobId: params.jobId,
        churchId: params.churchId,
        actorUid: params.actorUid,
        async progress(step, total, message) {
            const progress: JobProgress = { step, total, message };
            await ref.update({ progress, heartbeatAt: iso() }).catch(() => {});
        },
    };

    try {
        const result = await params.body(ctx);
        await ref.update({
            status: "complete" as JobStatus,
            result: result ?? null,
            completedAt: iso(),
            creditsSpent: params.credits,
            progress: { step: 1, total: 1, message: "Done" },
        });
        return { ...(await getJob(params.jobId))! } as Job<TInput, TResult>;
    } catch (err) {
        console.error(`[jobs] "${params.label}" failed`, err);
        const message = publicMessage(err);
        if (params.credits > 0) {
            await adjustCredits({
                churchId: params.churchId,
                delta: params.credits,
                reason: `Refund — ${params.label}`,
                actorUid: "system",
            }).catch((refundErr) => console.error("[jobs] refund failed", refundErr));
        }
        await ref.update({
            status: "failed" as JobStatus,
            error: message,
            // The raw error, for whoever investigates; never shown to the church.
            internalError: err instanceof Error ? err.message : String(err),
            completedAt: iso(),
            refunded: params.credits > 0,
        });
        throw new HttpError(500, `${message}${params.credits > 0 ? " Your credits were refunded." : ""}`);
    }
}

/**
 * Marks abandoned runs as failed and gives the credits back. A job is
 * abandoned when the instance executing it died mid-flight, so nothing else
 * will ever finish it. Safe to call opportunistically.
 */
export async function reapStaleJobs(churchId: string): Promise<number> {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
    const snap = await adminDb()
        .collection(JOBS)
        .where("churchId", "==", churchId)
        .where("status", "==", "running")
        .limit(20)
        .get();

    let reaped = 0;
    for (const doc of snap.docs) {
        const job = doc.data() as Job;
        const last = job.heartbeatAt ?? job.startedAt ?? job.createdAt;
        if (last > cutoff) continue;

        await doc.ref.update({
            status: "failed" as JobStatus,
            error: "The job stopped unexpectedly and was cancelled.",
            completedAt: iso(),
            refunded: job.creditsReserved > 0,
        });
        if (job.creditsReserved > 0 && !job.refunded) {
            await adjustCredits({
                churchId,
                delta: job.creditsReserved,
                reason: `Refund — abandoned job "${job.label}"`,
                actorUid: "system",
            }).catch((err) => console.error("[jobs] reaper refund failed", err));
        }
        reaped += 1;
    }
    return reaped;
}

/**
 * What the church sees when a job fails. Errors from the AI provider are about
 * our account, not theirs (a provider "no credits remaining" reads as if the
 * church is out of credits), so they're replaced with a plain explanation.
 */
function publicMessage(err: unknown): string {
    const raw = err instanceof Error ? err.message : "";
    const status = (err as { status?: number })?.status;
    const code = (err as { code?: string })?.code;

    if (/(CLAUDE|ANTHROPIC|OPENAI)_API_KEY/.test(raw) || status === 401) {
        return "The AI service isn't set up correctly. Please contact support.";
    }
    if ((status === 429 || status === 400) && (code === "insufficient_quota" || /quota|credit balance|credits remaining|billing/i.test(raw))) {
        return "The AI service is unavailable right now. Please try again later or contact support.";
    }
    if (status === 429) return "The AI service is busy. Please try again in a minute.";
    if (typeof status === "number") return "The AI service returned an error. Please try again.";
    return raw || "The job failed.";
}
