import type { Role } from "@/lib/types";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            churchId: string | null;
            role: Role;
        };
    }

    interface User {
        id: string;
        email?: string | null;
        name?: string | null;
        churchId?: string | null;
        role?: Role;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        churchId?: string | null;
        role?: Role;
    }
}

export {};
