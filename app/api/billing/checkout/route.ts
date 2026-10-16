import { NextRequest } from "next/server";
import { getChurch } from "@/lib/db";
import { createCheckoutSession, getPack, paymentsConfigured } from "@/lib/payments";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { handle, HttpError, requireOwner } from "@/lib/session";

/**
 * Starts a Stripe Checkout session. Owners only — buying credits is a billing
 * action, and leaders shouldn't be able to charge the church's card.
 */
export async function POST(req: NextRequest) {
    return handle(async () => {
        const actor = await requireOwner();

        if (!paymentsConfigured()) {
            throw new HttpError(
                503,
                "Card payments aren't switched on for this deployment yet. Ask your administrator to add credits."
            );
        }
        await rateLimit({ key: `checkout:${actor.churchId}`, limit: 10, windowSeconds: 300 });

        const body = await req.json();
        const pack = getPack(String(body.packId ?? ""));
        if (!pack) throw new HttpError(400, "Unknown credit pack.");

        const church = await getChurch(actor.churchId);
        if (!church) throw new HttpError(404, "Church not found.");
        if (church.status === "suspended") {
            throw new HttpError(403, "This church account is suspended.");
        }

        const session = await createCheckoutSession({
            pack,
            churchId: church.id,
            churchName: church.name,
            actorUid: actor.uid,
            customerEmail: actor.email ?? church.contactEmail,
            origin: process.env.NEXTAUTH_URL ?? req.nextUrl.origin,
        });

        await audit({
            churchId: church.id,
            actorUid: actor.uid,
            actorEmail: actor.email,
            action: "billing.checkout_started",
            target: pack.id,
            metadata: { credits: pack.credits, priceCents: pack.priceCents, sessionId: session.id },
        });

        if (!session.url) throw new HttpError(502, "Stripe did not return a checkout URL.");
        return { url: session.url };
    });
}
