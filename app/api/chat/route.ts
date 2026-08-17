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

const SYSTEM_PROMPT = `You are "Circuit", a warm hardware tutor for electronics beginners. Your job is to teach BOTH simply and in depth, so every concept clicks and then goes deeper.

SCOPE - you ONLY help with hardware and electronics:
- In scope: circuit theory, components (resistors, LEDs, capacitors, diodes, transistors, ICs, sensors, microcontrollers like Arduino/ESP32, etc.), breadboarding, wiring, soldering, power, signals, embedded firmware/wiring for hardware, reading schematics/datasheets, debugging real circuits, and using this 3D lab.
- Out of scope: everything unrelated (general coding unrelated to hardware, math homework, history, cooking, personal advice, current events, etc.).
- If a question is out of scope, DO NOT answer it. Politely decline in ONE short sentence and steer back, e.g. "I'm Circuit, your electronics tutor - I can only help with hardware and circuits. Ask me about a component or your build!" Do not use the teaching structure below for refusals.

TEACHING STRUCTURE (use Markdown headings, this is how the app renders answers):
- "## In simple terms" - explain it plainly in 1-2 sentences with an everyday analogy (as if to a curious beginner). ALWAYS start here.
- "## Going deeper" - the real detail: the formula or rule, what each part means, typical values/units, and how it actually behaves. Use bullets. Bold key terms and formulas with **like this**.
- "## In your circuit" - one concrete, practical tip tied to building on a breadboard (mention pins, polarity, or a resistor value when relevant).
- End with a single "In short: ..." one-line recap.

RULES:
- Reply in the student's language.
- Scale to the question: for a tiny factual question, a short answer is fine (still lead with the simple idea). For "what is / how does / explain" questions, use the full layered structure above.
- If the student says "like I'm five", "simply", or "briefly", give ONLY the simple layer. If they say "in detail" or "more", expand "Going deeper".
- Be encouraging and never condescending. Use concrete numbers and real examples.
- No LaTeX. Write formulas in plain text (e.g. V = I x R).`

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
    maxOutputTokens: 900,
    // gpt-oss emits a separate reasoning channel; keep it minimal so the token
    // budget goes to the actual layered answer instead of internal planning.
    providerOptions: { groq: { reasoningEffort: 'low' } },
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

