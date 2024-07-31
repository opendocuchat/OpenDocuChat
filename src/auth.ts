// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import GithubProvider from "next-auth/providers/github"

export const authOptions: NextAuthConfig = {
  providers: [
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
      authorization: {
        params: { scope: "read:user user:email" }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "github" && profile?.login) {
        return profile.login === process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN;
      }
      return false;
    },
  },
}

export default NextAuth(authOptions)

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)