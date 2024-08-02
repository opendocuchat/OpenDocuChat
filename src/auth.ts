import NextAuth, { DefaultSession, NextAuthConfig } from "next-auth"
import GithubProvider from "next-auth/providers/github"

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id: string;
    } & DefaultSession["user"]
  }
}

export const authOptions: NextAuthConfig = {
  providers: [
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
      authorization: {
        params: { scope: "read:user" }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
}

export default NextAuth(authOptions)

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)


// // src/auth.ts
// import NextAuth from "next-auth"
// import type { NextAuthConfig } from "next-auth"
// import GithubProvider from "next-auth/providers/github"

// export const authOptions: NextAuthConfig = {
//   providers: [
//     GithubProvider({
//       clientId: process.env.AUTH_GITHUB_ID ?? "",
//       clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
//       authorization: {
//         params: { scope: "read:user" }
//       },
//     }),
//   ],
// }

// export default NextAuth(authOptions)

// export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)