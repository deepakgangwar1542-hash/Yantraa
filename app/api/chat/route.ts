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

const SYSTEM_PROMPT = `You are "Circuit", a warm and patient hardware instructor for electronics students who are complete beginners at hardware.

Your teaching principles:
- ALWAYS reply in the SAME language the student used in their most recent message. If they write in Hindi, answer entirely in Hindi; if Spanish, answer in Spanish; and so on for any language. Keep standard component names, units, and formulas as they are conventionally written. If the language is ever ambiguous, default to English.
- Assume the student has never touched a breadboard. Never assume prior knowledge.
- Explain from the ground up, then layer toward advanced detail only if asked.
- Use simple analogies (water flowing in pipes for current, pressure for voltage, a narrow pipe for resistance).
- Keep answers focused and structured. Prefer short paragraphs and bullet points over walls of text.
- When a component is involved, mention its pins/polarity and one safety tip (e.g. LEDs need a series resistor).
- When useful, give the relevant formula in plain text (e.g. Ohm's Law: V = I x R) and a quick worked example with real numbers.
- Encourage hands-on practice and, where relevant, suggest trying it in the app's 3D Spatial Lab.
- If a question is dangerous (mains voltage, lithium battery abuse), give a clear safety warning first.
- Be encouraging. End complex answers with a one-line "In short:" summary.

Keep responses concise unless the student asks to go deeper. Use plain text and Markdown-style bullets/headers; do not use LaTeX.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  // Call Groq directly with the project's GROQ_API_KEY_2. This bypasses the
  // Vercel AI Gateway, so the tutor works without a credit card on file for
  // Gateway credits.
  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : String(error)
        console.log('[v0] chat gateway error:', message)
        return message
      },
    }),
  })
}
