import { NextRequest } from "next/server";
import { listVisitSlots, saveVisitSlot } from "@/lib/db";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";
import { publicToken } from "@/lib/ids";
import { str } from "@/lib/validate";

export async function GET() {
    return handle(async () => {
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);
        return { slots: await listVisitSlots(actor.churchId) };
    });
}

export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);

        const body = await req.json();
        const startsAt = str(body.startsAt, "Date and time", { max: 40 });
        if (Number.isNaN(Date.parse(startsAt))) {
            throw new HttpError(400, "That date and time could not be read.");
        }
        const capacity = Number(body.capacity ?? 10);
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
            throw new HttpError(400, "Capacity must be between 1 and 1000.");
        }
        const durationMinutes = Number(body.durationMinutes ?? 60);
        if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 600) {
            throw new HttpError(400, "Length must be between 5 and 600 minutes.");
        }

        const slot = await saveVisitSlot({
            churchId: actor.churchId,
            title: str(body.title, "Title", { max: 200 }),
            description: str(body.description, "Description", { max: 2000, required: false }),
            startsAt,
            durationMinutes,
            capacity,
            booked: 0,
            publicSlug: publicToken(10),
            status: "open",
            createdAt: new Date().toISOString(),
            createdBy: actor.uid,
        });
        return { slot };
    });
}
