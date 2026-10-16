import { NextRequest } from "next/server";
import { getChurch, getInviteByToken } from "@/lib/db";
import { handle, HttpError } from "@/lib/session";

/** Public preview of an invitation, so the accept page can show context. */
export async function GET(req: NextRequest) {
    return handle(async () => {
        const token = req.nextUrl.searchParams.get("token") ?? "";
        const invite = await getInviteByToken(token);
        if (!invite) throw new HttpError(404, "That invitation link is not valid.");
        if (invite.acceptedAt) throw new HttpError(409, "That invitation has already been used.");
        if (invite.expiresAt < new Date().toISOString()) {
            throw new HttpError(410, "That invitation has expired.");
        }
        const church = await getChurch(invite.churchId);
        return {
            email: invite.email,
            role: invite.role,
            churchName: church?.name ?? "a church",
        };
    });
}
