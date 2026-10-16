import { NextRequest } from "next/server";
import { listTours, saveTour } from "@/lib/db";
import { handle, requireChurchActor, requireModuleAccess } from "@/lib/session";
import { parseStops, str } from "@/lib/validate";

export async function GET() {
    return handle(async () => {
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);
        return { tours: await listTours(actor.churchId) };
    });
}

export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);

        const body = await req.json();
        const kind = body.kind === "guest_visit" ? "guest_visit" : "mission_trip";
        const now = new Date().toISOString();

        const tour = await saveTour({
            churchId: actor.churchId,
            kind,
            title: str(body.title, "Tour title", { max: 200 }),
            description: str(body.description, "Description", { max: 4000, required: false }),
            stops: parseStops(body.stops),
            createdAt: now,
            updatedAt: now,
            createdBy: actor.uid,
        });
        return { tour };
    });
}
