import { NextRequest } from "next/server";
import { deleteImageRecord, getImage } from "@/lib/db";
import { deleteImage } from "@/lib/storage";
import { handle, HttpError, requireChurchActor, requireModuleAccess } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
    return handle(async () => {
        const { id } = await params;
        const actor = await requireChurchActor();
        await requireModuleAccess("image_studio", actor);

        const image = await getImage(id);
        if (!image) throw new HttpError(404, "Image not found.");
        if (actor.role !== "super_admin" && image.churchId !== actor.churchId) {
            throw new HttpError(404, "Image not found.");
        }

        // Remove the bytes first; a stray file costs money, a stray record doesn't.
        await deleteImage(image.storagePath).catch((err) =>
            console.error("[images] storage delete failed", err)
        );
        await deleteImageRecord(id);
        return { ok: true };
    });
}
