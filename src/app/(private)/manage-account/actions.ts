// app/(private)/manage-account/actions.ts
"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

export async function addGithubUser(username: string) {
  if (!username) {
    return { error: "Username is required" };
  }

  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) {
      throw new Error("GitHub API request failed");
    }
    const data = await response.json();

    await sql`
      INSERT INTO account (github_id, github_username)
      VALUES (${data.id}, ${data.login})
      ON CONFLICT DO NOTHING
    `;

    revalidatePath("/manage-account");
    return { success: true, user: { id: data.id, username: data.login } };
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}

export async function deleteGithubUser(username: string) {
  if (!username) {
    return { error: "Username is required" };
  }

  try {
    await sql`
      DELETE FROM account
      WHERE github_username = ${username}
    `;

    revalidatePath("/manage-account");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}