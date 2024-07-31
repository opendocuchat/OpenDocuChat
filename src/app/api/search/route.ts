export async function GET(request: Request) {
  console.time("Total search time")

  // TODO: Remove tenant id
  const tenantId = 1

  // TODO: Replace Supabase with Vercel Postgres and Cohere with Vercel AI Integrations?
  /* console.time("Parse request")
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  console.timeEnd("Parse request")
  if (!query) return new Response('Missing query parameter: "query"', { status: 400 })

  console.time("Generate embedding")
  const embedResponse = await cohere.embed({
    texts: [query],
    inputType: "search_query",
    model: "embed-multilingual-v3.0",
  })
  console.timeEnd("Generate embedding")

  const queryEmbedding = JSON.stringify((embedResponse.embeddings as number[][])[0])

  console.time("Supabase vector search time")
  const { data, error } = await supabase.rpc("vector_search", {
    query_embedding: queryEmbedding,
    match_threshold: 0.2,
    match_count: 3,
    search_tenant_id: tenantId,
  })
  console.timeEnd("Supabase vector search time")

  if (error) {
    console.error("Supabase error:", error)
    return new Response(`Internal Server Error`, { status: 500 })
  }

  console.timeEnd("Total search time")
  return new Response(JSON.stringify({ documents: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }) */

  return new Response('TODO');
}