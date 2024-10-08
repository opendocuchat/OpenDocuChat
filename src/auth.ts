import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { sql } from "@vercel/postgres";

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: { device_code: { label: "Device Code", type: "text" } },
    async authorize(credentials) {
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

      const { rows } = await sql`
        SELECT * FROM account 
        WHERE github_id = ${userData.id}
      `;

      if (rows.length > 0) {
        return {
          id: userData.id.toString(),
          name: userData.login,
          image: userData.avatar_url,
        };
      }

      return null;
    },
  }),
];

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider();
      return { id: providerData.id, name: providerData.name };
    } else {
      return { id: provider.id, name: provider.name };
    }
  })
  .filter((provider) => provider.id !== "credentials");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
});