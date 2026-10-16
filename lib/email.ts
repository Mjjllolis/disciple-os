/**
 * Outbound email. Deliberately a thin seam: nothing in the product depends on
 * a particular provider, and with no provider configured mail is logged instead
 * of thrown away silently, so local development still shows invite links.
 *
 * To go live, set RESEND_API_KEY (and EMAIL_FROM) or replace `send()`.
 *
 * Under `npm run dev` (Firebase emulators) nothing is sent: every message
 * is caught in a local inbox at /dev/emails instead.
 */
import { adminDb } from "./firebaseAdmin";

export interface Mail {
    to: string;
    subject: string;
    /** Plain text. Kept plain on purpose — deliverability beats design here. */
    body: string;
}

const FROM = process.env.EMAIL_FROM ?? "DiscipleShip International <noreply@example.com>";

/** Collection the local test inbox reads from. Only ever written on the emulator. */
export const DEV_EMAILS = "devEmails";

export function captureLocally(): boolean {
    return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

export function emailConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
}

export async function send(mail: Mail): Promise<{ delivered: boolean }> {
    if (captureLocally()) {
        await adminDb().collection(DEV_EMAILS).add({ ...mail, from: FROM, createdAt: new Date().toISOString() });
        console.info(`[email] caught in local inbox /dev/emails — to ${mail.to}: ${mail.subject}`);
        return { delivered: true };
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        console.info(
            `[email] not configured — would have sent to ${mail.to}\n` +
                `  subject: ${mail.subject}\n${mail.body}`
        );
        return { delivered: false };
    }

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: FROM,
                to: [mail.to],
                subject: mail.subject,
                text: mail.body,
            }),
        });
        if (!res.ok) {
            console.error("[email] provider rejected the message", res.status, await res.text());
            return { delivered: false };
        }
        return { delivered: true };
    } catch (err) {
        console.error("[email] send failed", err);
        return { delivered: false };
    }
}

export function inviteEmail(params: {
    churchName: string;
    inviterEmail: string;
    acceptUrl: string;
}): Omit<Mail, "to"> {
    return {
        subject: `You've been invited to ${params.churchName} on DiscipleShip International`,
        body:
            `${params.inviterEmail} invited you to help run ${params.churchName} on ` +
            `DiscipleShip International.\n\nAccept the invitation:\n${params.acceptUrl}\n\n` +
            `This link expires in 14 days. If you weren't expecting it, you can ignore this email.`,
    };
}
