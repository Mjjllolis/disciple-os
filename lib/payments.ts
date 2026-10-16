import Stripe from "stripe";

/**
 * Credit packs.
 *
 * This is the ONLY place pack pricing lives — the pricing page, the billing
 * page, and the Stripe Checkout line item all read from here, so a price can
 * never be shown that differs from what is charged. Prices are defined inline
 * as `price_data`, so there is nothing to create in the Stripe dashboard.
 *
 * Sanity check before changing these: the most expensive operation is image
 * generation at 40 credits, which costs us roughly $0.04 of model spend. Keep
 * the retail rate comfortably above ~$0.002/credit.
 */
export interface CreditPack {
    id: string;
    name: string;
    credits: number;
    /** Whole cents, to avoid float money. */
    priceCents: number;
    blurb: string;
    featured?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
    {
        id: "starter",
        name: "Starter",
        credits: 1_000,
        priceCents: 1_900,
        blurb: "About ten surveys of a hundred responses.",
    },
    {
        id: "church",
        name: "Church",
        credits: 5_000,
        priceCents: 7_900,
        blurb: "A year of surveys plus a sermon series each quarter.",
        featured: true,
    },
    {
        id: "network",
        name: "Network",
        credits: 20_000,
        priceCents: 24_900,
        blurb: "Multi-campus, or a church planting network.",
    },
];

export function getPack(packId: string): CreditPack | undefined {
    return CREDIT_PACKS.find((p) => p.id === packId);
}

export function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Per-credit rate, for showing the volume discount. */
export function centsPerCredit(pack: CreditPack): number {
    return pack.priceCents / pack.credits;
}

export const CURRENCY = process.env.STRIPE_CURRENCY ?? "usd";

export function paymentsConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function webhookConfigured(): boolean {
    return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

let cached: Stripe | null = null;

export function stripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error(
            "Card payments are not configured. Set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) to enable them."
        );
    }
    if (!cached) {
        // No apiVersion pin: use the account's default so the SDK and the
        // account can't drift apart on a deploy.
        cached = new Stripe(key, { typescript: true });
    }
    return cached;
}

/**
 * Creates a one-time Checkout session for a credit pack.
 *
 * churchId travels in metadata rather than being trusted from the browser on
 * the way back — the webhook is the only thing that grants credits, and it
 * re-derives the credit amount from `packId` against CREDIT_PACKS so a
 * tampered session can never mint extra credits.
 */
export async function createCheckoutSession(input: {
    pack: CreditPack;
    churchId: string;
    churchName: string;
    actorUid: string;
    customerEmail?: string;
    origin: string;
}): Promise<Stripe.Checkout.Session> {
    const { pack } = input;

    return stripe().checkout.sessions.create({
        mode: "payment",
        client_reference_id: input.churchId,
        customer_email: input.customerEmail,
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: CURRENCY,
                    unit_amount: pack.priceCents,
                    product_data: {
                        name: `${pack.credits.toLocaleString()} analysis credits`,
                        description: `${pack.name} pack — ${pack.blurb}`,
                    },
                },
            },
        ],
        metadata: {
            churchId: input.churchId,
            churchName: input.churchName,
            packId: pack.id,
            actorUid: input.actorUid,
        },
        // Repeated on the PaymentIntent so a refund in the Stripe dashboard
        // still shows which church it belonged to.
        payment_intent_data: {
            metadata: { churchId: input.churchId, packId: pack.id },
        },
        success_url: `${input.origin}/dashboard/billing?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/dashboard/billing?purchase=cancelled`,
    });
}
