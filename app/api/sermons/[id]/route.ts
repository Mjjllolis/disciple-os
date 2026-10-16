import { NextRequest } from "next/server";
import { deleteSermon, getSermon, saveSermon } from "@/lib/db";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";
import type { Sermon } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string, churchId: string, role: string): Promise<Sermon> {
    const sermon = await getSermon(id);
    if (!sermon) throw new HttpError(404, "Sermon not found.");
    if (role !== "super_admin" && sermon.churchId !== churchId) {
        throw new HttpError(404, "Sermon not found.");
    }
    return sermon;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("sermon_builder", actor);
        return { sermon: await load(id, actor.churchId, actor.role) };
    });
}

/** Preachers rewrite what the model produced — that's the point. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("sermon_builder", actor);
        const existing = await load(id, actor.churchId, actor.role);

        const body = await req.json();
        const patch: Partial<Sermon> = {};
        for (const key of ["title", "bigIdea", "closingPrayer", "audience"] as const) {
            if (typeof body[key] === "string") patch[key] = body[key].slice(0, 5000);
        }
        for (const key of ["scripture", "illustrations", "application"] as const) {
            if (Array.isArray(body[key])) {
                patch[key] = body[key].map((v: unknown) => String(v).slice(0, 2000)).slice(0, 50);
            }
        }
        if (Array.isArray(body.points)) {
            patch.points = body.points.slice(0, 20).map((p: Record<string, unknown>) => ({
                heading: String(p.heading ?? "").slice(0, 300),
                body: String(p.body ?? "").slice(0, 5000),
                verses: Array.isArray(p.verses) ? p.verses.map((v: unknown) => String(v).slice(0, 200)) : [],
            }));
        }

        await saveSermon({ ...existing, ...patch, updatedAt: new Date().toISOString() });
        return { ok: true };
    });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("sermon_builder", actor);
        await load(id, actor.churchId, actor.role);
        await deleteSermon(id);
        return { ok: true };
    });
}
