import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email or Member ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. Check if the user is an Admin (by email)
        const adminUser = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (adminUser) {
          const passwordMatch = await bcrypt.compare(credentials.password, adminUser.password);
          if (passwordMatch) {
            return { id: adminUser.id, email: adminUser.email, role: "ADMIN" };
          }
        }

        // 2. Check if the user is a Member (by Member ID / Username)
        const memberAccount = await prisma.memberAccount.findUnique({
          where: { username: credentials.email },
          include: { member: true }
        });

        if (memberAccount && memberAccount.isActive) {
          const passwordMatch = await bcrypt.compare(credentials.password, memberAccount.passwordHash);
          if (passwordMatch) {
            // Return member details mapped to the session
            return { 
              id: memberAccount.memberId, 
              email: memberAccount.member.email || memberAccount.username, 
              role: "MEMBER",
              name: memberAccount.member.fullName
            };
          }
        }

        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };