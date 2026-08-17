import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { createGroq } from '@ai-sdk/groq'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY_2 })

export const maxDuration = 30

const SYSTEM_PROMPT = `You are "Circuit", a concise hardware tutor for electronics beginners.
- Reply in the student's language.
- Keep answers short: bullets or 2-3 sentences max unless asked to go deeper.
- Use simple analogies. Mention pin/polarity when relevant. End with "In short:" for complex answers.
- No LaTeX. Plain text only.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()
  // Only send last 5 messages to minimize tokens
  const recent = messages.slice(-5)

  // Call Groq directly with the project's GROQ_API_KEY_2. This bypasses the
  // Vercel AI Gateway, so the tutor works without a credit card on file for
  // Gateway credits.
  const result = streamText({
    model: groq('openai/gpt-oss-120b'),
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(recent),
    maxOutputTokens: 400,
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.log('[chat] error:', message)
        return message
      },
    }),
  })
}

