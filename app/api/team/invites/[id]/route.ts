import { NextRequest } from "next/server";
import { listInvites, revokeInvite } from "@/lib/db";
import { handle, HttpError, requireOwner } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireOwner();
        const invites = await listInvites(actor.churchId);
        if (!invites.some((i) => i.id === id)) throw new HttpError(404, "Invitation not found.");
        await revokeInvite(id);
        return { ok: true };
    });
}
