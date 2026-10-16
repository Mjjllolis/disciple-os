import { listSeries, listSermons } from "@/lib/db";
import { handle, requireChurchActor, requireModuleAccess } from "@/lib/session";

export async function GET() {
    return handle(async () => {
        const actor = await requireChurchActor();
        await requireModuleAccess("sermon_builder", actor);
        const [sermons, series] = await Promise.all([
            listSermons(actor.churchId),
            listSeries(actor.churchId),
        ]);
        return { sermons, series };
    });
}
