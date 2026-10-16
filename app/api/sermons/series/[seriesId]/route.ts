import { NextRequest } from "next/server";
import { getSeries, getSermon, saveSeries, saveSermon } from "@/lib/db";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";
import { str } from "@/lib/validate";

type Ctx = { params: Promise<{ seriesId: string }> };

/**
 * Edits a series in place: its title and premise, and the titles of its weeks
 * (body.weekTitles maps sermon id -> title). One request, so the card saves at once.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { seriesId } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("sermon_builder", actor);

        const series = await getSeries(seriesId);
        if (!series || (actor.role !== "super_admin" && series.churchId !== actor.churchId)) {
            throw new HttpError(404, "Series not found.");
        }

        const body = await req.json();
        const title = body.title === undefined ? series.title : str(body.title, "Series title", { max: 200 });
        const premise =
            body.premise === undefined ? series.premise : str(body.premise, "Premise", { max: 2000, required: false });
        await saveSeries({ ...series, title, premise });

        const weekTitles = (body.weekTitles ?? {}) as Record<string, unknown>;
        const now = new Date().toISOString();
        for (const [sermonId, raw] of Object.entries(weekTitles)) {
            const sermon = await getSermon(sermonId);
            // Only weeks that really belong to this series.
            if (!sermon || sermon.seriesId !== series.id) continue;
            const weekTitle = str(raw, "Week title", { max: 200 });
            if (weekTitle !== sermon.title) await saveSermon({ ...sermon, title: weekTitle, updatedAt: now });
        }
        return { ok: true };
    });
}
