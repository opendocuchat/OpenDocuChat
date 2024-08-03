import Together from "together-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("Api chat Request body:", req.body);

  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error("Error parsing request body:", error);
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const message: string = body.message;

  if (!message) {
    return NextResponse.json(
      { error: 'Missing parameter: "message"' },
      { status: 400 }
    );
  }

  const together = new Together({
    apiKey: process.env.TOGETHER_API_KEY,
  });

  try {
    const response = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages: [{ role: "user", content: message }],
      temperature: 0.3,
    });

    if (!response.choices[0].message) {
      return NextResponse.json(
        { reply: "I'm sorry, I don't have an answer to that." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { reply: response.choices[0].message.content || "" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}

// TODO: Refactor search endpoint and call the function instead of an HTTP request
// const documentsResponse = await fetch(`${process.env.API_BASE_URL}/api/search?query=${message}`)
// if (!documentsResponse.ok) throw new Error("Failed to fetch documents")

// TODO: Replace Supabase with Vercel Postgres and Cohere with Vercel AI Integrations?
//  const documents = (await documentsResponse.json()).documents.map((doc: ChatDocument) => ({
//   id: String(doc.id),
//   tenant_id: String(doc.tenant_id),
//   url: doc.url,
//   content: doc.content,
// }))

// const stream = await cohere.chatStream({
//   message: message,
//   model: "command-r",
//   preamble:
//     "ToDo",
//   promptTruncation: "AUTO",
//   documents: documents,
// })

// const textEncoder = new TextEncoder()

// let fullResponse = ""
// let citations: any[] = []

// const asyncGenerator = (async function* () {
//   yield textEncoder.encode(JSON.stringify({ eventType: "documents", documents: documents }) + "\n")

//   for await (const streamedChatResponse of stream) {
//     yield textEncoder.encode(JSON.stringify(streamedChatResponse) + "\n")

//     if (streamedChatResponse.eventType === "text-generation") {
//       fullResponse += streamedChatResponse.text
//     } else if (streamedChatResponse.eventType === "citation-generation") {
//       citations = citations.concat(streamedChatResponse.citations)
//     }

//     if (streamedChatResponse.eventType === "stream-end") {
//       break
//     }
//   }
// })()

// const readableStream = new ReadableStream({
//   async pull(controller) {
//     const { value, done } = await asyncGenerator.next()
//     if (done) {
//       controller.close()

//       // save message to database once response is fully received and streamed back
//       const documentsList = documents.map((doc: any) => `${doc.id} | ${doc.url}: ${doc.content}`).join('\n')
//       const citationsList = citations.map((citation: any) => `${citation.text} (${citation.documentIds.join(', ')})`).join('\n')
//       const completeResponse = `${fullResponse}\n\nCitations:\n${citationsList}\n\nDocuments:\n${documentsList}`
//       try {
//         const { error } = await supabase
//           .from("message")
//           .insert([{ query: message, response: completeResponse }])

//         if (error) throw error
//       } catch (error) {
//         console.error('Error saving message to database:', error)
//       }

//     } else {
//       controller.enqueue(value)
//     }
//   },
// })

// return new Response(readableStream)
