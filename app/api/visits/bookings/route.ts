import { NextRequest } from "next/server";
import { listBookings, listVisitSlots } from "@/lib/db";
import { handle, requireChurchActor, requireModuleAccess } from "@/lib/session";

export async function GET(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);
        const slotId = req.nextUrl.searchParams.get("slotId") ?? undefined;
        const [bookings, slots] = await Promise.all([
            listBookings(actor.churchId, slotId),
            listVisitSlots(actor.churchId),
        ]);
        return { bookings, slots };
    });
}
