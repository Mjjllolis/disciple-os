import { NextRequest } from "next/server";
import { getChurch, listCreditTransactions, listSurveysForChurch, setChurchStatus, updateChurch } from "@/lib/db";
import { SIZE_TIERS } from "@/lib/churchProfile";
import { handle, HttpError, requireSuperAdmin } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        await requireSuperAdmin();
        const { id } = await params;
        const church = await getChurch(id);
        if (!church) throw new HttpError(404, "Church not found.");
        const [surveys, transactions] = await Promise.all([
            listSurveysForChurch(id),
            listCreditTransactions(id, 100),
        ]);
        return { church, surveys, transactions };
    });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        await requireSuperAdmin();
        const { id } = await params;
        const body = await req.json();
        if (body.status !== undefined) {
            const status = String(body.status);
            if (!["active", "suspended"].includes(status)) {
                throw new HttpError(400, "Status must be active or suspended.");
            }
            await setChurchStatus(id, status as "active" | "suspended");
        }
        // Admins confirm a church's size (it sets pricing) and can lock it.
        if (body.sizeTier !== undefined || body.sizeTierLocked !== undefined) {
            const tier = body.sizeTier === undefined ? undefined : String(body.sizeTier ?? "");
            if (tier && !SIZE_TIERS.some((t) => t.id === tier)) throw new HttpError(400, "Unknown church size.");
            await updateChurch(id, {
                ...(tier !== undefined && { sizeTier: tier || null }),
                ...(body.sizeTierLocked !== undefined && { sizeTierLocked: Boolean(body.sizeTierLocked) }),
            });
        }
        return { ok: true };
    });
}
