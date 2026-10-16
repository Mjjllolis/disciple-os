import { NextRequest } from "next/server";
import { createUser, getChurch, getInviteByToken, getUser, markInviteAccepted } from "@/lib/db";
import { audit } from "@/lib/audit";
import { handle, HttpError } from "@/lib/session";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { str } from "@/lib/validate";
import { adminAuth, adminDb, COL } from "@/lib/firebaseAdmin";

/**
 * Accepts a team invitation. Creates the Firebase user when the invitee is new,
 * or attaches an existing account to the church.
 */
export async function POST(req: NextRequest) {
    return handle(async () => {
        await rateLimit({
            key: `invite-accept:${clientKey(req.headers)}`,
            limit: 10,
            windowSeconds: 300,
        });

        const body = await req.json();
        const token = str(body.token, "Invitation", { max: 100 });
        const password = str(body.password, "Password", { max: 200, required: false });
        const name = str(body.name, "Your name", { max: 120, required: false });

        const invite = await getInviteByToken(token);
        if (!invite) throw new HttpError(404, "That invitation link is not valid.");
        if (invite.acceptedAt) throw new HttpError(409, "That invitation has already been used.");
        if (invite.expiresAt < new Date().toISOString()) {
            throw new HttpError(410, "That invitation has expired. Ask for a new one.");
        }

        const church = await getChurch(invite.churchId);
        if (!church) throw new HttpError(404, "That church no longer exists.");

        // Existing account? Attach it. New? Create it.
        let uid: string;
        let created = false;
        try {
            const existing = await adminAuth().getUserByEmail(invite.email);
            uid = existing.uid;
        } catch {
            if (password.length < 8) {
                throw new HttpError(400, "Choose a password of at least 8 characters.");
            }
            const user = await adminAuth().createUser({
                email: invite.email,
                password,
                displayName: name || undefined,
            });
            uid = user.uid;
            created = true;
        }

        const profile = await getUser(uid);
        if (profile) {
            if (profile.churchId && profile.churchId !== invite.churchId) {
                throw new HttpError(
                    409,
                    "That email already belongs to another church. Use a different address."
                );
            }
            await adminDb()
                .collection(COL.users)
                .doc(uid)
                .update({ churchId: invite.churchId, role: invite.role });
        } else {
            await createUser({
                uid,
                email: invite.email,
                name: name || undefined,
                churchId: invite.churchId,
                role: invite.role,
            });
        }

        await markInviteAccepted(invite.id);
        await audit({
            churchId: invite.churchId,
            actorUid: uid,
            actorEmail: invite.email,
            action: "team.joined",
            metadata: { role: invite.role, createdAccount: created },
        });

        return { email: invite.email, churchName: church.name, createdAccount: created };
    });
}
