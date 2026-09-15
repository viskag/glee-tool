import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "./lib/mongodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = await getDb();
        const user = await db
          .collection("users")
          .findOne({ email: (credentials.email as string).toLowerCase().trim() });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash as string
        );
        if (!valid) return null;

        return {
  id: String(user._id),
  email: user.email as string,
  name: `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() || "Researcher",
  role: (user.role as string) ?? "researcher",
};
      },
    }),
  ],
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.role = (user as { role?: string }).role;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      (session.user as { id?: string }).id = token.id as string;
      (session.user as { role?: string }).role = token.role as string;
    }
    return session;
  },
},
});