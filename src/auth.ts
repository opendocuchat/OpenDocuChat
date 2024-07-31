import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "github") {
        return profile?.login === process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN;
      }
      return false;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
})