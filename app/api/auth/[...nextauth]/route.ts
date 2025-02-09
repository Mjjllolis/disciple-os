import NextAuth, { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { signInWithEmailAndPassword } from "firebase/auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}
import { auth } from "@/lib/firebase"; // Make sure your Firebase is properly set up

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    // Authenticate user with Firebase
                    const userCredential = await signInWithEmailAndPassword(auth, credentials!.email, credentials!.password);
                    return { id: userCredential.user.uid, email: userCredential.user.email };
                } catch (error) {
                    throw new Error("Invalid email or password");
                }
            },
        }),
    ],
    pages: {
        signIn: "/login", // Custom login page
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub!;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        },
    },
});

export { handler as GET, handler as POST };
