export async function POST(req: Request) {

  const { searchParams } = new URL(req.url)
  const message = searchParams.get("message")
  if (!message) return new Response('Missing query parameter: "message"', { status: 400 })

  // TODO: Refactor search endpoint and call the function instead of an HTTP request
  const documentsResponse = await fetch(`${process.env.API_BASE_URL}/api/search?query=${message}`)
  if (!documentsResponse.ok) throw new Error("Failed to fetch documents")
  
  // TODO: Replace Supabase with Vercel Postgres and Cohere with Vercel AI Integrations?
  /* const documents = (await documentsResponse.json()).documents.map((doc: ChatDocument) => ({
    id: String(doc.id),
    tenant_id: String(doc.tenant_id),
    url: doc.url,
    content: doc.content,
  }))

  const stream = await cohere.chatStream({
    message: message,
    model: "command-r",
    preamble:
      "ToDo",
    promptTruncation: "AUTO",
    documents: documents,
  })

  const textEncoder = new TextEncoder()

  let fullResponse = ""
  let citations: any[] = []

  const asyncGenerator = (async function* () {
    yield textEncoder.encode(JSON.stringify({ eventType: "documents", documents: documents }) + "\n")

    for await (const streamedChatResponse of stream) {
      yield textEncoder.encode(JSON.stringify(streamedChatResponse) + "\n")

      if (streamedChatResponse.eventType === "text-generation") {
        fullResponse += streamedChatResponse.text
      } else if (streamedChatResponse.eventType === "citation-generation") {
        citations = citations.concat(streamedChatResponse.citations)
      }

      if (streamedChatResponse.eventType === "stream-end") {
        break
      }
    }
  })()

  const readableStream = new ReadableStream({
    async pull(controller) {
      const { value, done } = await asyncGenerator.next()
      if (done) {
        controller.close()

        // save message to database once response is fully received and streamed back
        const documentsList = documents.map((doc: any) => `${doc.id} | ${doc.url}: ${doc.content}`).join('\n')
        const citationsList = citations.map((citation: any) => `${citation.text} (${citation.documentIds.join(', ')})`).join('\n')
        const completeResponse = `${fullResponse}\n\nCitations:\n${citationsList}\n\nDocuments:\n${documentsList}`
        try {
          const { error } = await supabase
            .from("message")
            .insert([{ query: message, response: completeResponse }])
          
          if (error) throw error
        } catch (error) {
          console.error('Error saving message to database:', error)
        }

      } else {
        controller.enqueue(value)
      }
    },
  })

  return new Response(readableStream) */

  return new Response('TODO');
}