import { NextRequest } from "next/server";
import { deleteVisitSlot, listVisitSlots, saveVisitSlot } from "@/lib/db";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string, churchId: string) {
    const slot = (await listVisitSlots(churchId)).find((s) => s.id === id);
    if (!slot) throw new HttpError(404, "That visit time was not found.");
    return slot;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);
        const slot = await load(id, actor.churchId);

        const body = await req.json();
        const status = body.status === "closed" ? "closed" : "open";
        await saveVisitSlot({ ...slot, status });
        return { ok: true };
    });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);
        const slot = await load(id, actor.churchId);
        if (slot.booked > 0) {
            throw new HttpError(
                409,
                "People have already booked this time. Close it instead so their bookings are kept."
            );
        }
        await deleteVisitSlot(id);
        return { ok: true };
    });
}
