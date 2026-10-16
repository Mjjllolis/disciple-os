import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "./authOptions";
import { getChurch, getSurvey } from "./db";
import { hasModule, MODULES } from "./modules";
import type { Church, ModuleId, Role, Survey } from "./types";

export interface Actor {
    uid: string;
    email: string | null;
    churchId: string | null;
    role: Role;
}

/** Thrown by the guards below; turned into a response by `handle()`. */
export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "HttpError";
    }
}

export async function currentActor(): Promise<Actor | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    return {
        uid: session.user.id,
        email: session.user.email ?? null,
        churchId: session.user.churchId ?? null,
        role: session.user.role ?? "owner",
    };
}

/** Requires any signed-in user. */
export async function requireActor(): Promise<Actor> {
    const actor = await currentActor();
    if (!actor) throw new HttpError(401, "You must be signed in.");
    return actor;
}

/** Requires a signed-in user who belongs to a church. */
export async function requireChurchActor(): Promise<Actor & { churchId: string }> {
    const actor = await requireActor();
    if (!actor.churchId) {
        throw new HttpError(403, "Your account is not linked to a church yet.");
    }
    return actor as Actor & { churchId: string };
}

/**
 * Confirms the church is active and entitled to the module before any work is
 * charged for. Every metered route goes through this, so a new module cannot
 * accidentally ship without a paywall.
 */
export async function requireModuleAccess(
    moduleId: ModuleId,
    actor: Actor & { churchId: string }
): Promise<Church> {
    const church = await getChurch(actor.churchId);
    if (!church) throw new HttpError(404, "Church not found.");
    if (church.status === "suspended") {
        throw new HttpError(403, "This church account is suspended.");
    }
    // Super admins bypass entitlement so they can support and demo any church.
    if (actor.role !== "super_admin" && !hasModule(church.modules, moduleId)) {
        throw new HttpError(
            402,
            `${MODULES[moduleId].name} isn't enabled for your church yet. Contact your administrator to add it.`
        );
    }
    return church;
}

/** Owners can manage the team and church settings; leaders cannot. */
export async function requireOwner(): Promise<Actor & { churchId: string }> {
    const actor = await requireChurchActor();
    if (actor.role !== "owner" && actor.role !== "super_admin") {
        throw new HttpError(403, "Only a church owner can do that.");
    }
    return actor;
}

export async function requireSuperAdmin(): Promise<Actor> {
    const actor = await requireActor();
    if (actor.role !== "super_admin") throw new HttpError(403, "Admin access required.");
    return actor;
}

/**
 * Loads a survey and confirms the actor may act on it. Super admins may read
 * any survey; everyone else is confined to their own church's data.
 */
export async function requireSurveyAccess(
    surveyId: string,
    actor: Actor
): Promise<Survey> {
    const survey = await getSurvey(surveyId);
    if (!survey) throw new HttpError(404, "Survey not found.");
    if (actor.role !== "super_admin" && survey.churchId !== actor.churchId) {
        // 404 rather than 403 so ids from other tenants aren't confirmable.
        throw new HttpError(404, "Survey not found.");
    }
    return survey;
}

/** Wraps a route handler so thrown HttpErrors become clean JSON responses. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
    try {
        return NextResponse.json((await fn()) ?? { ok: true });
    } catch (err) {
        if (err instanceof HttpError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        const message = err instanceof Error ? err.message : "Unexpected error";
        console.error("[api]", err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
