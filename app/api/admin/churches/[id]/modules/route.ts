import { NextRequest } from "next/server";
import { getChurch, setModuleEntitlement } from "@/lib/db";
import { MODULES } from "@/lib/modules";
import { audit } from "@/lib/audit";
import { handle, HttpError, requireSuperAdmin } from "@/lib/session";
import { str } from "@/lib/validate";
import type { ModuleId } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** Turns a paid module on or off for one church. */
export async function POST(req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const actor = await requireSuperAdmin();
        const { id } = await params;

        const church = await getChurch(id);
        if (!church) throw new HttpError(404, "Church not found.");

        const body = await req.json();
        const moduleId = String(body.moduleId) as ModuleId;
        if (!MODULES[moduleId]) throw new HttpError(400, "Unknown module.");
        const enabled = Boolean(body.enabled);
        const note = str(body.note, "Note", { max: 300, required: false });

        await setModuleEntitlement(id, moduleId, {
            enabled,
            enabledAt: enabled ? new Date().toISOString() : null,
            note,
        });
        await audit({
            churchId: id,
            actorUid: actor.uid,
            actorEmail: actor.email,
            action: enabled ? "module.enabled" : "module.disabled",
            target: moduleId,
            metadata: { note },
        });
        return { ok: true };
    });
}
