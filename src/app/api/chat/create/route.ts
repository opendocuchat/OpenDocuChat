import { sql } from "@vercel/postgres";

export async function POST() {
  try {
    const chatResponse =
      await sql`INSERT INTO chat (id) VALUES (DEFAULT) RETURNING id`;
    return new Response(JSON.stringify({ chatId: chatResponse.rows[0].id }));
  } catch (error) {
    console.error("Supabase error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
