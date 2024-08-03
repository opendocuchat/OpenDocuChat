import NextAuth, { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.device_code) return null;

        const tokenResponse = await fetch(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              client_id: process.env.AUTH_GITHUB_ID,
              device_code: credentials.device_code,
              grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            }),
          }
        );

        const tokenData = await tokenResponse.json();
        if (tokenData.error) return null;

        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${tokenData.access_token}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        if (!userResponse.ok) return null;

        const userData = await userResponse.json();

        if (userData.login === process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN) {
          return {
            name: userData.login,
            image: userData.avatar_url,
          };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
