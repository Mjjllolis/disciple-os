import { listJobs, reapStaleJobs } from "@/lib/jobs";
import { handle, requireChurchActor } from "@/lib/session";

export async function GET() {
    return handle(async () => {
        const actor = await requireChurchActor();
        // Opportunistic cleanup: abandoned runs get failed and refunded here,
        // so a dead instance never permanently strands a church's credits.
        await reapStaleJobs(actor.churchId).catch(() => {});
        return { jobs: await listJobs(actor.churchId) };
    });
}
