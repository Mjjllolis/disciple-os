import { NextRequest } from "next/server";
import { getChurch, updateChurch } from "@/lib/db";
import { audit } from "@/lib/audit";
import { handle, HttpError, requireChurchActor, requireOwner } from "@/lib/session";
import { str } from "@/lib/validate";
import { SIZE_TIERS } from "@/lib/churchProfile";
import type { Church } from "@/lib/types";

export async function GET() {
    return handle(async () => {
        const actor = await requireChurchActor();
        const church = await getChurch(actor.churchId);
        if (!church) throw new HttpError(404, "Church not found.");
        return { church, canManage: actor.role === "owner" || actor.role === "super_admin" };
    });
}

export async function PATCH(req: NextRequest) {
    return handle(async () => {
        const actor = await requireOwner();
        const body = await req.json();

        const patch: Partial<Church> = {};
        if (body.name !== undefined) patch.name = str(body.name, "Church name", { max: 150 });
        if (body.city !== undefined) patch.city = str(body.city, "City", { max: 100, required: false });
        if (body.state !== undefined) patch.state = str(body.state, "State", { max: 60, required: false });
        if (body.website !== undefined) {
            const site = str(body.website, "Website", { max: 300, required: false });
            if (site && !/^https?:\/\//i.test(site)) {
                throw new HttpError(400, "Website must start with http:// or https://");
            }
            patch.website = site || null;
        }
        if (body.logoUrl !== undefined) {
            const logo = str(body.logoUrl, "Logo URL", { max: 500, required: false });
            if (logo && !/^https?:\/\//i.test(logo)) {
                throw new HttpError(400, "Logo URL must start with http:// or https://");
            }
            patch.logoUrl = logo || null;
        }
        if (body.brandColor !== undefined) {
            const color = str(body.brandColor, "Brand colour", { max: 20, required: false });
            if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
                throw new HttpError(400, "Brand colour must be a hex value like #89a4b0.");
            }
            patch.brandColor = color || null;
        }

        if (body.denomination !== undefined) {
            patch.denomination = str(body.denomination, "Denomination", { max: 100, required: false }) || null;
        }
        if (body.leadPastor !== undefined) {
            patch.leadPastor = str(body.leadPastor, "Lead pastor", { max: 120, required: false }) || null;
        }
        if (body.phone !== undefined) {
            patch.phone = str(body.phone, "Phone", { max: 40, required: false }) || null;
        }
        if (body.sizeTier !== undefined) {
            const tier = String(body.sizeTier ?? "");
            if (tier && !SIZE_TIERS.some((t) => t.id === tier)) throw new HttpError(400, "Unknown church size.");
            // Size sets pricing, so once an admin has confirmed it the owner can't lower it.
            const church = await getChurch(actor.churchId);
            if (church?.sizeTierLocked && (church.sizeTier ?? "") !== tier) {
                throw new HttpError(403, "Your church size has been confirmed. Contact support to change it.");
            }
            patch.sizeTier = tier || null;
        }

        if (Object.keys(patch).length) {
            await updateChurch(actor.churchId, patch);
            await audit({
                churchId: actor.churchId,
                actorUid: actor.uid,
                actorEmail: actor.email,
                action: "church.settings_updated",
                metadata: { fields: Object.keys(patch) },
            });
        }
        return { ok: true };
    });
}
