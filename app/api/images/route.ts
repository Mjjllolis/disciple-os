import { listImages } from "@/lib/db";
import { IMAGE_SIZES } from "@/lib/images";
import { handle, requireChurchActor, requireModuleAccess } from "@/lib/session";

export async function GET() {
    return handle(async () => {
        const actor = await requireChurchActor();
        await requireModuleAccess("image_studio", actor);
        return { images: await listImages(actor.churchId), sizes: IMAGE_SIZES };
    });
}
