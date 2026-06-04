import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  basePath: "/api/auth",
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session: async ({ session, user }) => {
      // Block banned users — fetch ban status from DB
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isBanned: true, role: true },
      });
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          isBanned: dbUser?.isBanned ?? false,
          role: dbUser?.role ?? "user",
        },
      };
    },
  },
  logger: {
    error(error) {
      console.error("[auth] ERROR:", error);
    },
    warn(code) {
      console.warn("[auth] WARN:", code);
    },
  },
})
