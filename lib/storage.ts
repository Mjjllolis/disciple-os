import { getStorage } from "firebase-admin/storage";
import { adminDb } from "./firebaseAdmin";

/**
 * Generated images are written to Firebase Storage rather than kept as data
 * URLs, because image model outputs are megabytes each and Firestore documents
 * cap out at 1 MiB.
 */
function bucket() {
    const name =
        process.env.FIREBASE_STORAGE_BUCKET ??
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!name) {
        throw new Error(
            "No storage bucket configured. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET " +
                "(e.g. your-project.appspot.com)."
        );
    }
    // Touch Firestore first so the shared admin app is initialized.
    adminDb();
    return getStorage().bucket(name);
}

/** Uploads bytes and returns a long-lived public download URL. */
export async function uploadImage(params: {
    path: string;
    data: Buffer;
    contentType: string;
}): Promise<{ url: string; path: string }> {
    const file = bucket().file(params.path);
    // A download token is what makes the standard Firebase URL form work.
    const token = crypto.randomUUID();

    await file.save(params.data, {
        contentType: params.contentType,
        metadata: { metadata: { firebaseStorageDownloadTokens: token } },
        resumable: false,
    });

    const url =
        `https://firebasestorage.googleapis.com/v0/b/${bucket().name}/o/` +
        `${encodeURIComponent(params.path)}?alt=media&token=${token}`;

    return { url, path: params.path };
}

export async function deleteImage(path: string): Promise<void> {
    await bucket().file(path).delete({ ignoreNotFound: true });
}
