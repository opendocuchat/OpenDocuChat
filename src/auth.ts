import NextAuth, { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      async authorize(credentials): Promise<User | null> {
        console.log("credentials", credentials)
        
        if (!credentials?.accessToken) return null;
    
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${credentials.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (!userResponse.ok) return null;
    
        const userData = await userResponse.json();
        console.log("userData", userData)
        console.log("process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN", process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN)

        if (userData.login === process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN) {
          return {
            id: userData.id.toString(),
            name: userData.login,
            image: userData.avatar_url
          };
        }
        return null
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});