import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { createChurchWithOwner } from "@/lib/db";
import { handle, HttpError } from "@/lib/session";
import { str } from "@/lib/validate";

/** Credits a brand-new church starts with so they can try the module. */
const WELCOME_CREDITS = Number(process.env.WELCOME_CREDITS ?? 250);

export async function POST(req: NextRequest) {
    return handle(async () => {
        const body = await req.json();
        const email = str(body.email, "Email", { max: 200 }).toLowerCase();
        const password = str(body.password, "Password", { max: 200 });
        const churchName = str(body.churchName, "Church name", { max: 150 });
        const name = str(body.name, "Your name", { max: 120, required: false });
        const city = str(body.city, "City", { max: 100, required: false });
        const state = str(body.state, "State", { max: 60, required: false });

        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            throw new HttpError(400, "Enter a valid email address.");
        }
        if (password.length < 8) {
            throw new HttpError(400, "Password must be at least 8 characters.");
        }

        let uid: string;
        try {
            const user = await adminAuth().createUser({
                email,
                password,
                displayName: name || undefined,
            });
            uid = user.uid;
        } catch (err) {
            const code = (err as { code?: string }).code;
            if (code === "auth/email-already-exists") {
                throw new HttpError(409, "An account with that email already exists.");
            }
            if (code === "auth/invalid-password") {
                throw new HttpError(400, "That password is too weak.");
            }
            throw err;
        }

        try {
            const church = await createChurchWithOwner({
                churchName,
                contactEmail: email,
                city: city || undefined,
                state: state || undefined,
                ownerUid: uid,
                ownerName: name || undefined,
                startingCredits: WELCOME_CREDITS,
            });
            return { churchId: church.id, credits: church.credits };
        } catch (err) {
            // Don't strand an auth user with no church behind it.
            await adminAuth().deleteUser(uid).catch(() => {});
            throw err;
        }
    });
}
