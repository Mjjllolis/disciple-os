import { NextRequest } from "next/server";
import { bookVisitSlot, getChurch, getVisitSlotBySlug, SlotFullError } from "@/lib/db";
import { send } from "@/lib/email";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { handle, HttpError } from "@/lib/session";
import { str } from "@/lib/validate";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { slug } = await params;
        await rateLimit({
            key: `visit-book:${slug}:${clientKey(req.headers)}`,
            limit: 5,
            windowSeconds: 300,
            message: "Too many booking attempts. Please wait a few minutes.",
        });

        const slot = await getVisitSlotBySlug(slug);
        if (!slot) throw new HttpError(404, "This booking link is not valid.");
        if (slot.status !== "open") throw new HttpError(403, "Bookings for this time are closed.");

        const body = await req.json();
        const email = str(body.email, "Email", { max: 200 }).toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            throw new HttpError(400, "Enter a valid email address.");
        }
        const partySize = Number(body.partySize ?? 1);
        if (!Number.isInteger(partySize) || partySize < 1 || partySize > 50) {
            throw new HttpError(400, "Party size must be between 1 and 50.");
        }

        try {
            await bookVisitSlot({
                slotId: slot.id,
                churchId: slot.churchId,
                name: str(body.name, "Name", { max: 200 }),
                email,
                phone: str(body.phone, "Phone", { max: 60, required: false }),
                partySize,
                notes: str(body.notes, "Notes", { max: 2000, required: false }),
            });
        } catch (err) {
            if (err instanceof SlotFullError) throw new HttpError(409, err.message);
            throw err;
        }

        const church = await getChurch(slot.churchId);
        const when = new Date(slot.startsAt).toLocaleString();
        await send({
            to: email,
            subject: `You're booked: ${slot.title}`,
            body:
                `Thanks for booking a visit with ${church?.name ?? "us"}.\n\n` +
                `${slot.title}\n${when}\nParty of ${partySize}\n\n` +
                `If you need to change or cancel, just reply to this email.`,
        });

        return { ok: true, startsAt: slot.startsAt };
    });
}
