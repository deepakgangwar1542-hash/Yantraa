import { streamText, convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from 'ai'
import { groqModel } from '@/lib/groq'

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

  const result = streamText({
    model: groqModel('llama-3.1-8b-instant'),
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(recent),
    maxTokens: 400,
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

