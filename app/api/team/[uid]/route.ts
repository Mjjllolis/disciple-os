import { NextRequest } from "next/server";
import { getChurch, getUser, removeMember, setMemberRole } from "@/lib/db";
import { audit } from "@/lib/audit";
import { handle, HttpError, requireOwner } from "@/lib/session";
import type { Role } from "@/lib/types";

type Ctx = { params: Promise<{ uid: string }> };

async function loadMember(uid: string, churchId: string) {
    const member = await getUser(uid);
    if (!member || member.churchId !== churchId) throw new HttpError(404, "Team member not found.");
    return member;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { uid } = await params;
        const actor = await requireOwner();
        const member = await loadMember(uid, actor.churchId);

        const body = await req.json();
        const role: Role = body.role === "owner" ? "owner" : "leader";

        // The church must keep at least one owner who can manage billing.
        const church = await getChurch(actor.churchId);
        if (role === "leader" && church?.ownerUid === uid) {
            throw new HttpError(409, "This is the church's primary owner and must stay an owner.");
        }

        await setMemberRole(uid, role);
        await audit({
            churchId: actor.churchId,
            actorUid: actor.uid,
            actorEmail: actor.email,
            action: "team.role_changed",
            target: member.email,
            metadata: { role },
        });
        return { ok: true };
    });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { uid } = await params;
        const actor = await requireOwner();
        const member = await loadMember(uid, actor.churchId);

        if (uid === actor.uid) throw new HttpError(409, "You can't remove yourself.");
        const church = await getChurch(actor.churchId);
        if (church?.ownerUid === uid) {
            throw new HttpError(409, "The church's primary owner can't be removed.");
        }

        await removeMember(uid);
        await audit({
            churchId: actor.churchId,
            actorUid: actor.uid,
            actorEmail: actor.email,
            action: "team.removed",
            target: member.email,
        });
        return { ok: true };
    });
}
