import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { HttpError } from "./session";

const BUCKETS = "rateLimits";

/**
 * Fixed-window limiter backed by Firestore, so it holds across instances.
 * The previous in-memory version reset on every cold start and was useless
 * behind more than one container.
 */
export async function rateLimit(options: {
    key: string;
    limit: number;
    windowSeconds: number;
    message?: string;
}): Promise<void> {
    const { key, limit, windowSeconds } = options;
    const window = Math.floor(Date.now() / (windowSeconds * 1000));
    const ref = adminDb().collection(BUCKETS).doc(`${key}:${window}`);

    let count: number;
    try {
        const snap = await ref.get();
        if (!snap.exists) {
            await ref.set({
                count: 1,
                key,
                // Set a TTL policy on this field in Firestore to auto-purge.
                expiresAt: new Date((window + 2) * windowSeconds * 1000),
            });
            count = 1;
        } else {
            await ref.update({ count: FieldValue.increment(1) });
            count = Number(snap.data()?.count ?? 0) + 1;
        }
    } catch (err) {
        // A limiter outage must not lock everyone out of the product.
        console.error("[rateLimit] backend unavailable, allowing request", err);
        return;
    }

    if (count > limit) {
        throw new HttpError(429, options.message ?? "Too many requests. Please wait a moment and try again.");
    }
}

/** Best-effort caller fingerprint for anonymous endpoints. */
export function clientKey(headers: Headers): string {
    return (
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headers.get("x-real-ip") ||
        "unknown"
    );
}
