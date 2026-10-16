import { updateChurch } from "@/lib/db";
import { handle, requireChurchActor } from "@/lib/session";

/** Marks the guided product tour as finished so it stops appearing. */
export async function POST() {
    return handle(async () => {
        const actor = await requireChurchActor();
        await updateChurch(actor.churchId, { onboardedAt: new Date().toISOString() });
        return { ok: true };
    });
}
