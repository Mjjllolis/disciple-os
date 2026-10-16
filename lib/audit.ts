import { adminDb } from "./firebaseAdmin";
import type { AuditEvent } from "./types";

const AUDIT = "auditEvents";

/**
 * Records who did what. Never throws — an audit failure must not take down the
 * action being audited, but it is logged loudly so it can't rot silently.
 */
export async function audit(event: {
    churchId: string | null;
    actorUid: string;
    actorEmail?: string | null;
    action: string;
    target?: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    try {
        await adminDb().collection(AUDIT).add({
            ...event,
            createdAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[audit] failed to record", event.action, err);
    }
}

export async function listAuditEvents(churchId: string, limit = 100): Promise<AuditEvent[]> {
    const snap = await adminDb()
        .collection(AUDIT)
        .where("churchId", "==", churchId)
        .limit(limit * 2)
        .get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as AuditEvent)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
}

export async function listAllAuditEvents(limit = 200): Promise<AuditEvent[]> {
    const snap = await adminDb().collection(AUDIT).limit(limit * 2).get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as AuditEvent)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
}
