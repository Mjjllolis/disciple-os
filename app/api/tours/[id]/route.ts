import { NextRequest } from "next/server";
import { deleteTour, getTour, saveTour } from "@/lib/db";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";
import { parseStops, str } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string, churchId: string, role: string) {
    const tour = await getTour(id);
    if (!tour) throw new HttpError(404, "Tour not found.");
    if (role !== "super_admin" && tour.churchId !== churchId) {
        throw new HttpError(404, "Tour not found.");
    }
    return tour;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);
        return { tour: await load(id, actor.churchId, actor.role) };
    });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);
        const existing = await load(id, actor.churchId, actor.role);

        const body = await req.json();
        const tour = await saveTour({
            ...existing,
            title: body.title !== undefined ? str(body.title, "Tour title", { max: 200 }) : existing.title,
            description:
                body.description !== undefined
                    ? str(body.description, "Description", { max: 4000, required: false })
                    : existing.description,
            stops: body.stops !== undefined ? parseStops(body.stops) : existing.stops,
            updatedAt: new Date().toISOString(),
        });
        return { tour };
    });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("tours", actor);
        await load(id, actor.churchId, actor.role);
        await deleteTour(id);
        return { ok: true };
    });
}
