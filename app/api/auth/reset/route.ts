import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { send } from "@/lib/email";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { handle } from "@/lib/session";
import { str } from "@/lib/validate";

/**
 * Sends a password reset link. Always reports success, so this endpoint can't
 * be used to discover which email addresses have accounts.
 */
export async function POST(req: NextRequest) {
    return handle(async () => {
        await rateLimit({
            key: `pw-reset:${clientKey(req.headers)}`,
            limit: 5,
            windowSeconds: 900,
            message: "Too many reset requests. Please wait fifteen minutes.",
        });

        const body = await req.json();
        const email = str(body.email, "Email", { max: 200 }).toLowerCase();

        try {
            const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
            const link = await adminAuth().generatePasswordResetLink(email, {
                url: `${base}/login`,
            });
            await send({
                to: email,
                subject: "Reset your DiscipleShip International password",
                body:
                    `Someone asked to reset the password for this account.\n\n` +
                    `Reset it here:\n${link}\n\n` +
                    `If that wasn't you, you can safely ignore this email.`,
            });
        } catch (err) {
            // Unknown address, or mail is down. Never leak which.
            console.info("[auth] reset requested for an address we could not mail", err);
        }

        return { ok: true };
    });
}
