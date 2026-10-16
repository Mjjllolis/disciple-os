import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth as clientAuth } from "./firebase";
import { getUser } from "./db";
import type { Role } from "./types";

/**
 * Emails listed here are always treated as platform super admins, so the very
 * first admin exists before any user document does.
 * SUPER_ADMIN_EMAILS="you@example.com,ops@example.com"
 */
export function isSuperAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    return (process.env.SUPER_ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
        .includes(email.toLowerCase());
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }
                let uid: string;
                let email: string | null;
                try {
                    // Firebase Admin cannot verify passwords, so sign-in goes
                    // through the client SDK even on the server.
                    const cred = await signInWithEmailAndPassword(
                        clientAuth,
                        credentials.email,
                        credentials.password
                    );
                    uid = cred.user.uid;
                    email = cred.user.email;
                } catch {
                    throw new Error("Invalid email or password");
                }

                const profile = await getUser(uid).catch(() => null);
                const role: Role = isSuperAdminEmail(email)
                    ? "super_admin"
                    : (profile?.role ?? "owner");

                return {
                    id: uid,
                    email,
                    name: profile?.name ?? null,
                    churchId: profile?.churchId ?? null,
                    role,
                };
            },
        }),
    ],
    pages: { signIn: "/login" },
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.sub = user.id;
                token.churchId = (user as { churchId?: string | null }).churchId ?? null;
                token.role = (user as { role?: Role }).role ?? "owner";
            }
            // A church created right after signup won't be on the original
            // token, so re-read the profile when the client calls update().
            if (trigger === "update" && token.sub) {
                const profile = await getUser(token.sub).catch(() => null);
                if (profile) {
                    token.churchId = profile.churchId;
                    token.role = isSuperAdminEmail(token.email as string) ? "super_admin" : profile.role;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub!;
                session.user.churchId = (token.churchId as string | null) ?? null;
                session.user.role = (token.role as Role) ?? "owner";
            }
            return session;
        },
    },
};
