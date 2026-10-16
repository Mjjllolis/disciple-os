import { getChurch, listCreditTransactions } from "@/lib/db";
import { handle, HttpError, requireChurchActor } from "@/lib/session";
import { CREDITS_PER_RESPONSE } from "@/lib/analysis";
import { CREDIT_PACKS, paymentsConfigured } from "@/lib/payments";

export async function GET() {
    return handle(async () => {
        const actor = await requireChurchActor();
        const church = await getChurch(actor.churchId);
        if (!church) throw new HttpError(404, "Church not found.");
        return {
            credits: church.credits,
            creditsPerResponse: CREDITS_PER_RESPONSE,
            transactions: await listCreditTransactions(actor.churchId, 100),
            packs: CREDIT_PACKS,
            paymentsEnabled: paymentsConfigured(),
            canPurchase: actor.role === "owner" || actor.role === "super_admin",
        };
    });
}
