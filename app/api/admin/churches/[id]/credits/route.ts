import { NextRequest } from "next/server";
import { adjustCredits, InsufficientCreditsError } from "@/lib/db";
import { handle, HttpError, requireSuperAdmin } from "@/lib/session";
import { str } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

/** Grant (positive) or claw back (negative) credits for a church. */
export async function POST(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const actor = await requireSuperAdmin();
        const { id } = await params;
        const body = await req.json();

        const delta = Number(body.delta);
        if (!Number.isInteger(delta) || delta === 0) {
            throw new HttpError(400, "Enter a whole number of credits, positive or negative.");
        }
        if (Math.abs(delta) > 1_000_000) throw new HttpError(400, "That adjustment is too large.");
        const reason = str(body.reason, "Reason", { max: 200 });

        try {
            const balance = await adjustCredits({ churchId: id, delta, reason, actorUid: actor.uid });
            return { balance };
        } catch (err) {
            if (err instanceof InsufficientCreditsError) throw new HttpError(400, err.message);
            throw err;
        }
    });
}
