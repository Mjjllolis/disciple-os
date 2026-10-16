import { NextRequest } from "next/server";
import { getChurch, getVisitSlotBySlug } from "@/lib/db";
import { handle, HttpError } from "@/lib/session";

type Ctx = { params: Promise<{ slug: string }> };

/** Public. Returns just enough to render the booking form. */
export async function GET(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { slug } = await params;
        const slot = await getVisitSlotBySlug(slug);
        if (!slot) throw new HttpError(404, "This booking link is not valid.");
        const church = await getChurch(slot.churchId);

        return {
            slot: {
                id: slot.id,
                title: slot.title,
                description: slot.description ?? "",
                startsAt: slot.startsAt,
                durationMinutes: slot.durationMinutes,
                seatsLeft: Math.max(0, slot.capacity - slot.booked),
                status: slot.status,
            },
            church: {
                name: church?.name ?? "",
                logoUrl: church?.logoUrl ?? null,
                brandColor: church?.brandColor ?? null,
            },
        };
    });
}
