import Together from "together-ai";
import { sql } from "@vercel/postgres";

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

type Message = {
  role: "user" | "assistant" | "system";
  content: any;
};

interface ChatDocument {
  id: string;
  url: string;
  content: string;
  similarity: string;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { message, chatId } = body;
  if (!message) {
    return new Response('Missing field in request body: "message"', {
      status: 400,
    });
  }
  if (!chatId) {
    return new Response('Missing field in request body: "chatId"', {
      status: 400,
    });
  }

  await sql`INSERT INTO message (chat_id, sender, content) VALUES (${chatId}, 'USER', ${message})`;

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  const documentsResponse = await fetch(
    `${apiBaseUrl}/api/search?query=${message}`
  );
  if (!documentsResponse.ok) throw new Error("Failed to fetch documents");

  const documents: ChatDocument[] = (
    await documentsResponse.json()
  ).documents.map((doc: ChatDocument) => ({
    id: String(doc.id),
    url: doc.url,
    content: doc.content,
    similarity: `${Math.round(parseFloat(doc.similarity) * 100)}%`,
  }));

  const systemMessage: Message = {
    role: "system" as const,
    content: "You are a helpful chatbot for OpenDocuChat",
  };

  const chatHistoryResponse = await sql`
    SELECT id, chat_id, sender, content, document_ids, created_at
    FROM message
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC;
  `;
  const chatHistory = chatHistoryResponse.rows;
  const userMessages = chatHistory.map(
    (message): Message => ({
      role: message.sender === "USER" ? "user" : ("assistant" as const),
      content: message.content,
    })
  );

  const documentMessage: Message = {
    role: "system" as const,
    content:
      `{
      "documents": [
        ${documents
          .map((document) => {
            return `{
            "id": ${document.id},
            "url": "${document.url}",
            "content": "${document.content}"
          }`;
          })
          .join(",")}
      ],
      "instructions": "Please respond to the user's query using the information from these documents. ` +
      `Provide citations for every claim in the format [source: url]. ` +
      `For example, if a sentence is based on information from document 1, ` +
      `add [source: ${documents[0].url}] to the end of the sentence.."
    }`,
  };

  const messages = [systemMessage, ...userMessages, documentMessage];

  const stream = await together.chat.completions.create({
    model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    messages: messages,
    stream: true,
  });

  const textEncoder = new TextEncoder();

  let fullResponse = "";
  let citations: any[] = [];

  const asyncGenerator = (async function* () {
    yield textEncoder.encode(
      JSON.stringify({ eventType: "documents", documents: documents }) + "\n"
    );

    for await (const streamedChatResponse of stream) {
      yield textEncoder.encode(JSON.stringify(streamedChatResponse) + "\n");
      if (streamedChatResponse.object === "chat.completion.chunk") {
        for (const choice of streamedChatResponse.choices) {
          if (choice.delta) {
            fullResponse += choice.delta.content;
          }
        }
      }
    }
    //   if (streamedChatResponse.object === "text-generation") {
    //     fullResponse += streamedChatResponse.text;
    //   } else if (streamedChatResponse.eventType === "citation-generation") {
    //     citations = citations.concat(streamedChatResponse.citations);
    //   }

    //   if (streamedChatResponse.eventType === "stream-end") {
    //     break;
    //   }
  })();

  const readableStream = new ReadableStream({
    async pull(controller) {
      const { value, done } = await asyncGenerator.next();
      if (done) {
        controller.close();

        const documentsList = documents
          .map((doc: any) => `${doc.id} | ${doc.url}: ${doc.content}`)
          .join("\n");
        const citationsList = citations
          .map(
            (citation: any) =>
              `${citation.text} (${citation.documentIds.join(", ")})`
          )
          .join("\n");
        const completeResponse = `${fullResponse}\n\nCitations:\n${citationsList}\n\nDocuments:\n${documentsList}`;
        try {
          const documentIds = documents.map((doc) => parseInt(doc.id, 10));
          await sql`
            INSERT INTO message (chat_id, sender, content, document_ids)
            VALUES (${chatId}, 'BOT', ${fullResponse}, ${
            documentIds as any
          }::int[])
          `;
        } catch (error) {
          console.error("Error saving message to database:", error);
        }
      } else {
        controller.enqueue(value);
      }
    },
  });

  return new Response(readableStream);
}
