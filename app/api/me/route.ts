import { getChurch, getUser } from "@/lib/db";
import { resolveEntitlements } from "@/lib/modules";
import { handle, requireActor } from "@/lib/session";

export async function GET() {
    return handle(async () => {
        const actor = await requireActor();
        const [profile, church] = await Promise.all([
            getUser(actor.uid),
            actor.churchId ? getChurch(actor.churchId) : Promise.resolve(null),
        ]);

        return {
            user: {
                uid: actor.uid,
                email: actor.email,
                name: profile?.name ?? null,
                role: actor.role,
                churchId: actor.churchId,
            },
            church,
            // Super admins see everything so they can support any church.
            modules: resolveEntitlements(church?.modules).map((m) =>
                actor.role === "super_admin" ? { ...m, enabled: true } : m
            ),
            needsOnboarding: Boolean(church) && !church?.onboardedAt,
        };
    });
}
