"use server"

import Together from "together-ai"

export const togetherApi = async (message: Record<string, any>): Promise<string> => {
  const together = new Together({
    apiKey: process.env.TOGETHER_API_KEY,
  })

  const stream = await together.chat.completions.create({
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    messages: [{ role: "user", content: "Tell me a short joke." }],
    stream: true,
    // max_tokens: 512,
    temperature: 0.3,
  })

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "")
  }

  return "Success"
}
