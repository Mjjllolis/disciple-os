import { getSermon } from "./db";
import { HttpError } from "./session";
import type { Sermon } from "./types";

/** Loads a sermon the actor may see; other churches' sermons 404 rather than 403. */
export async function loadSermon(id: string, actor: { churchId: string; role: string }): Promise<Sermon> {
    const sermon = await getSermon(id);
    if (!sermon || (actor.role !== "super_admin" && sermon.churchId !== actor.churchId)) {
        throw new HttpError(404, "Sermon not found.");
    }
    return sermon;
}
