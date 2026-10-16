import { cert, getApp, getApps, initializeApp, applicationDefault, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const SETUP_HINT =
    "Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT (the full service-account JSON, " +
    "as a single-line string) to .env.local, or set FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / " +
    "FIREBASE_PRIVATE_KEY. Download the JSON from Firebase Console > Project settings > Service accounts.";

/** Set by `firebase emulators:exec`; the Admin SDK then talks to the emulators. */
function usingEmulators(): boolean {
    return Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

function buildApp(): App {
    if (getApps().length) return getApp();

    if (usingEmulators()) {
        // Emulators need no credentials, only a project id.
        return initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw) {
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error("FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON. " + SETUP_HINT);
        }
        return initializeApp({
            credential: cert({
                projectId: parsed.project_id,
                clientEmail: parsed.client_email,
                privateKey: String(parsed.private_key).replace(/\\n/g, "\n"),
            }),
        });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
        return initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, "\n"),
            }),
        });
    }

    // Works on Google-hosted runtimes (Cloud Run, App Hosting) with no explicit key.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return initializeApp({ credential: applicationDefault(), projectId });
    }

    throw new Error(SETUP_HINT);
}

/** True when server-side Firebase credentials are present. */
export function isAdminConfigured(): boolean {
    return Boolean(
        usingEmulators() ||
            process.env.FIREBASE_SERVICE_ACCOUNT ||
            (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
            process.env.GOOGLE_APPLICATION_CREDENTIALS
    );
}

// Cached on globalThis, not in a module variable: Next bundles this module once
// per route, but every copy shares the same admin app and Firestore instance,
// and a second settings() call on that instance throws.
const cache = globalThis as { __adminFirestore?: ReturnType<typeof getFirestore> };

export function adminDb() {
    if (!cache.__adminFirestore) {
        const firestore = getFirestore(buildApp());
        // Optional question fields (scaleMin, themeGroup, city, …) are undefined
        // rather than absent; without this Firestore rejects the whole write.
        firestore.settings({ ignoreUndefinedProperties: true });
        cache.__adminFirestore = firestore;
    }
    return cache.__adminFirestore;
}

export function adminAuth() {
    return getAuth(buildApp());
}

/** Firestore collection names, in one place. */
export const COL = {
    churches: "churches",
    users: "users",
    surveys: "surveys",
    responses: "responses",
    analyses: "analyses",
    creditTransactions: "creditTransactions",
} as const;
