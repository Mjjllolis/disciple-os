import { NextRequest } from "next/server";
import { createInvite, getChurch, listInvites, listMembers } from "@/lib/db";
import { inviteEmail, send } from "@/lib/email";
import { audit } from "@/lib/audit";
import { handle, HttpError, requireChurchActor, requireOwner } from "@/lib/session";
import { str } from "@/lib/validate";
import type { Role } from "@/lib/types";

export async function GET() {
    return handle(async () => {
        const actor = await requireChurchActor();
        const [members, invites] = await Promise.all([
            listMembers(actor.churchId),
            listInvites(actor.churchId),
        ]);
        return { members, invites, canManage: actor.role === "owner" || actor.role === "super_admin" };
    });
}

export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireOwner();
        const body = await req.json();
        const email = str(body.email, "Email", { max: 200 }).toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            throw new HttpError(400, "Enter a valid email address.");
        }
        const role: Role = body.role === "owner" ? "owner" : "leader";

        const existing = await listMembers(actor.churchId);
        if (existing.some((m) => m.email === email)) {
            throw new HttpError(409, "That person is already on your team.");
        }

        const invite = await createInvite({
            churchId: actor.churchId,
            email,
            role,
            invitedBy: actor.uid,
        });

        const church = await getChurch(actor.churchId);
        const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
        const mail = inviteEmail({
            churchName: church?.name ?? "your church",
            inviterEmail: actor.email ?? "A teammate",
            acceptUrl: `${base}/invite/${invite.token}`,
        });
        const { delivered } = await send({ to: email, ...mail });

        await audit({
            churchId: actor.churchId,
            actorUid: actor.uid,
            actorEmail: actor.email,
            action: "team.invited",
            target: email,
            metadata: { role },
        });

        // Surfaced so the owner can copy the link manually when mail is off.
        return { invite, emailDelivered: delivered, acceptUrl: `${base}/invite/${invite.token}` };
    });
}
