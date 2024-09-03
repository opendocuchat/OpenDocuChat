import Together from "together-ai";
import { sql } from "@vercel/postgres";

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

export async function GET(request: Request) {
  console.log("search request");
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  if (!query)
    return new Response('Missing query parameter: "query"', { status: 400 });

  // TODO (optional): add llm for search query generation based on chat context (e.g. "explain more" -> "explain more about XYZ conversation topic")
  let response;

  try {
    const embeddingResponse = await together.embeddings.create({
      model: "BAAI/bge-large-en-v1.5",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    const vectorQuery = `[${queryEmbedding.join(",")}]`;

    response = await sql`
      SELECT id, url, content, 1 - (cosine_distance(embedding, ${vectorQuery})) AS similarity
      FROM document
      WHERE active = TRUE AND 1 - (cosine_distance(embedding, ${vectorQuery})) > 0.3
      ORDER BY similarity DESC
      LIMIT 10
      `;
  } catch (error) {
    console.error("Supabase error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  // TODO (optional): add reranker for retrieved documents

  return new Response(JSON.stringify({ documents: response.rows }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
