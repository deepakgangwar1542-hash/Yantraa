import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { z } from 'zod'
import { COMPONENT_IDS } from '@/lib/lab-actions'

export const maxDuration = 30

const ids = COMPONENT_IDS as [string, ...string[]]

const componentRef = z.object({
  componentId: z.enum(ids).describe('Catalog id of the part'),
  ordinal: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('1-based when several of the same part exist, e.g. "second resistor" -> 2'),
})

const pinRef = z.object({
  component: componentRef,
  pinHint: z
    .string()
    .optional()
    .describe('Which pin, in the user\'s words: "anode", "positive", "lead a", "pin 2", "+"'),
})

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add'), componentId: z.enum(ids) }),
  z.object({ type: z.literal('mode'), mode: z.enum(['move', 'wire']) }),
  z.object({ type: z.literal('connect'), from: pinRef, to: pinRef }),
  z.object({ type: z.literal('run'), on: z.boolean() }),
  z.object({ type: z.literal('delete'), component: componentRef.optional() }),
  z.object({ type: z.literal('clear') }),
  z.object({ type: z.literal('press'), component: componentRef }),
  z.object({ type: z.literal('zoom'), direction: z.enum(['in', 'out', 'reset']) }),
])

const responseSchema = z.object({
  actions: z
    .array(actionSchema)
    .describe('Ordered actions to run. Empty if the request is not a lab command.'),
  reply: z
    .string()
    .describe('One short spoken confirmation of what you did, e.g. "Added a resistor."'),
})

const SYSTEM = `You translate a student's spoken request into structured actions for a 3D electronics breadboard lab.

Available parts (componentId): ${COMPONENT_IDS.join(', ')}.

Respond with ONLY a JSON object (no markdown, no prose) of the exact shape:
{"actions": Action[], "reply": string}

Where each Action is one of:
{"type":"add","componentId":<id>}
{"type":"mode","mode":"move"|"wire"}
{"type":"connect","from":{"component":{"componentId":<id>,"ordinal"?:number},"pinHint"?:string},"to":{ ...same... }}
{"type":"run","on":boolean}
{"type":"delete","component"?:{"componentId":<id>,"ordinal"?:number}}
{"type":"clear"}
{"type":"press","component":{"componentId":<id>,"ordinal"?:number}}
{"type":"zoom","direction":"in"|"out"|"reset"}

Rules:
- Only emit actions the user actually asked for. If they just chat or ask a question, return {"actions":[],"reply":<short answer>}.
- "start wire" / "wire mode" -> mode wire. "move mode" -> mode move.
- "run" / "power on" / "simulate" -> run on:true. "stop" -> run on:false.
- To wire two parts use a single connect action; put the user's own pin words in pinHint ("anode","positive","lead a","pin 2","+"). If a needed part is not on the board yet, emit its add action first, then connect.
- "ordinal" is 1-based only when several of the same part exist ("the second resistor" -> 2).
- "reply" is ONE short sentence confirming what you did, in the SAME language the user used.`

export async function POST(req: Request) {
  try {
    const { transcript, board } = (await req.json()) as {
      transcript?: string
      board?: string
    }
    if (!transcript || !transcript.trim()) {
      return Response.json({ actions: [], reply: '' })
    }

    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: SYSTEM,
      prompt: `${board ? board + '\n\n' : ''}Student said: "${transcript}"\n\nJSON:`,
      maxTokens: 250,
    })

    // Pull the JSON object out of the reply (models occasionally wrap it).
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) {
      return Response.json({ actions: [], reply: '' })
    }
    const parsed = JSON.parse(text.slice(start, end + 1))
    const result = responseSchema.safeParse(parsed)
    if (!result.success) {
      // Keep any valid reply text even if some actions failed validation.
      const reply = typeof parsed?.reply === 'string' ? parsed.reply : ''
      console.log('[v0] voice schema mismatch:', result.error.message)
      return Response.json({ actions: [], reply })
    }
    return Response.json(result.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log('[v0] voice route error:', message)
    return Response.json({ actions: [], reply: '', error: message }, { status: 200 })
  }
}

