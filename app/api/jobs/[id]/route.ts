import { NextRequest } from "next/server";
import { getJob } from "@/lib/jobs";
import { handle, HttpError, requireActor } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/** Polled by the UI while a metered job runs, for live progress. */
export async function GET(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireActor();
        const job = await getJob(id);

        // Not-yet-created reads as pending rather than an error, because the
        // client starts polling before the POST has claimed the id.
        if (!job) return { job: null, pending: true };
        if (actor.role !== "super_admin" && job.churchId !== actor.churchId) {
            throw new HttpError(404, "Job not found.");
        }
        return { job, pending: false };
    });
}
