import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { adjustCredits } from "@/lib/db";
import { adminDb } from "@/lib/firebaseAdmin";
import { getPack, stripe } from "@/lib/payments";
import { audit } from "@/lib/audit";

/**
 * Stripe webhook — the ONLY place credits are granted from a purchase.
 *
 * Three things make this safe:
 *   1. The signature is verified against STRIPE_WEBHOOK_SECRET, so the body
 *      can't be forged.
 *   2. The credit amount is re-derived from `packId` against our own registry,
 *      never read from the amount the browser saw.
 *   3. Every processed event id is written with `.create()`, which fails if the
 *      document exists — so Stripe's at-least-once delivery can't double-credit.
 */

// firebase-admin needs the Node runtime, and the raw body must stay unparsed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROCESSED = "stripeEvents";

/** Returns false when this event has already been handled. */
async function claimEvent(event: Stripe.Event): Promise<boolean> {
    try {
        await adminDb().collection(PROCESSED).doc(event.id).create({
            type: event.type,
            receivedAt: new Date().toISOString(),
        });
        return true;
    } catch {
        return false;
    }
}

async function grantCredits(session: Stripe.Checkout.Session, eventId: string): Promise<void> {
    // Delayed payment methods fire completed before the money settles.
    if (session.payment_status !== "paid") {
        console.info(`[stripe] session ${session.id} not paid yet (${session.payment_status}); skipping`);
        return;
    }

    const churchId = session.metadata?.churchId;
    const packId = session.metadata?.packId;
    if (!churchId || !packId) {
        console.error(`[stripe] session ${session.id} is missing churchId/packId metadata`);
        return;
    }

    const pack = getPack(packId);
    if (!pack) {
        console.error(`[stripe] session ${session.id} references unknown pack "${packId}"`);
        return;
    }

    const balance = await adjustCredits({
        churchId,
        delta: pack.credits,
        reason: `${pack.name} pack — ${pack.credits.toLocaleString()} credits purchased`,
        actorUid: session.metadata?.actorUid ?? "stripe",
    });

    await adminDb().collection("purchases").add({
        churchId,
        packId,
        credits: pack.credits,
        amountTotal: session.amount_total,
        currency: session.currency,
        stripeSessionId: session.id,
        stripeEventId: eventId,
        customerEmail: session.customer_details?.email ?? null,
        createdAt: new Date().toISOString(),
    });

    await audit({
        churchId,
        actorUid: session.metadata?.actorUid ?? "stripe",
        action: "billing.credits_purchased",
        target: packId,
        metadata: { credits: pack.credits, amountTotal: session.amount_total, balance },
    });

    console.info(`[stripe] granted ${pack.credits} credits to church ${churchId} (balance ${balance})`);
}

export async function POST(req: NextRequest) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
        console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set; refusing the webhook");
        return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Must be the raw body — parsing it first breaks signature verification.
    const payload = await req.text();

    let event: Stripe.Event;
    try {
        event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid signature";
        console.error("[stripe] signature verification failed:", message);
        return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
    }

    if (!(await claimEvent(event))) {
        // Already handled — acknowledge so Stripe stops retrying.
        return NextResponse.json({ received: true, duplicate: true });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
                await grantCredits(event.data.object as Stripe.Checkout.Session, event.id);
                break;

            case "checkout.session.async_payment_failed": {
                const session = event.data.object as Stripe.Checkout.Session;
                console.warn(`[stripe] async payment failed for session ${session.id}`);
                break;
            }

            case "charge.refunded": {
                // Deliberately not automatic: clawing back credits a church has
                // already spent would drive the balance negative. Surface it and
                // let an admin adjust from /admin.
                const charge = event.data.object as Stripe.Charge;
                console.warn(
                    `[stripe] charge ${charge.id} refunded for church ` +
                        `${charge.metadata?.churchId ?? "unknown"} — review credits manually`
                );
                break;
            }

            default:
                break;
        }
    } catch (err) {
        // Release the claim so Stripe's retry can succeed.
        await adminDb().collection(PROCESSED).doc(event.id).delete().catch(() => {});
        console.error(`[stripe] handler failed for ${event.type}`, err);
        return NextResponse.json({ error: "Handler failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
