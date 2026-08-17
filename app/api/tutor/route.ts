import { groqModel } from '@/lib/groq'
import { generateText } from 'ai'

export const maxDuration = 30

interface CircuitSnapshot {
  goal?: string
  components?: string[]
  connections?: { from: string; to: string }[]
  simulation?: { led_on?: boolean; errors?: string[] }
  learner_level?: string
}

interface TutorRequest {
  snapshot: CircuitSnapshot
  level: number
  question?: string
}

const HINT_PROMPTS: Record<number, string> = {
  1: 'One Socratic question nudge, no answer. 1 sentence.',
  2: 'Point to the specific area needing fixing. 2 sentences max.',
  3: 'Exact fix with pin names or code. 3 sentences max.',
  4: 'Full explanation, step by step, beginner-friendly. Be thorough.',
}

const SYSTEM = `You are "Circuit", a concise hardware tutor.
Reply ONLY as JSON: {"hint":string,"is_working":boolean,"highlighted_components":string[]}
No markdown. Same language as the student's question.`

export async function POST(req: Request) {
  try {
    const { snapshot, level, question } = (await req.json()) as TutorRequest
    const errors = snapshot?.simulation?.errors ?? []
    const isWorking = errors.length === 0 && (snapshot?.simulation?.led_on ?? false)

    const prompt = [
      `Goal: ${snapshot?.goal ?? '?'}`,
      `Parts: ${(snapshot?.components ?? []).join(', ') || 'none'}`,
      `Errors: ${errors.join('; ') || 'none'}`,
      question ? `Question: "${question}"` : '',
      `Level: ${HINT_PROMPTS[level] ?? HINT_PROMPTS[1]}`,
    ].filter(Boolean).join('\n')

    const { text } = await generateText({
      model: groqModel('llama-3.1-8b-instant'),
      system: SYSTEM,
      prompt,
      maxTokens: 300,
    })

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) {
      return Response.json({ hint: 'Try again!', is_working: isWorking, highlighted_components: [] })
    }
    const parsed = JSON.parse(text.slice(start, end + 1))
    return Response.json({
      hint: typeof parsed.hint === 'string' ? parsed.hint : '',
      is_working: typeof parsed.is_working === 'boolean' ? parsed.is_working : isWorking,
      highlighted_components: Array.isArray(parsed.highlighted_components) ? parsed.highlighted_components : [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[tutor] error:', message)
    return Response.json({ hint: 'Something went wrong.', is_working: false, highlighted_components: [] }, { status: 200 })
  }
}

