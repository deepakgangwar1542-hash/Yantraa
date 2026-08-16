import {
  type LabAction,
  type ComponentRef,
  type PinRef,
  resolveComponentId,
  parseOrdinal,
} from '@/lib/lab-actions'

/**
 * Fast, offline keyword parser for lab voice commands. Returns an ordered list
 * of actions when it recognizes the phrasing, or `null` so the caller can fall
 * back to the LLM parser for anything more natural.
 */
export function parseVoiceCommand(raw: string): LabAction[] | null {
  const text = raw.toLowerCase().trim().replace(/[.!?]+$/, '')
  if (!text) return null

  /* --- simple, whole-utterance intents ---------------------------- */
  if (/\b(clear|reset|empty|wipe)\b.*\b(board|everything|all|circuit)\b/.test(text) || text === 'clear')
    return [{ type: 'clear' }]

  if (/\b(start|begin|enter|turn on)\b.*\bwir/.test(text) || /\bwire mode\b/.test(text) || text === 'start wire' || text === 'wire')
    return [{ type: 'mode', mode: 'wire' }]

  if (/\b(move mode|stop wir|exit wir|drag mode)\b/.test(text))
    return [{ type: 'mode', mode: 'move' }]

  if (/\b(run|simulate|power (it )?(on|up)|turn (it )?on|start (the )?circuit|go live)\b/.test(text))
    return [{ type: 'run', on: true }]

  if (/\b(stop|power (it )?off|turn (it )?off|halt|pause)\b/.test(text) && !/wir/.test(text))
    return [{ type: 'run', on: false }]

  if (/\bzoom in\b|\bcloser\b/.test(text)) return [{ type: 'zoom', direction: 'in' }]
  if (/\bzoom out\b|\bfarther\b|\bfurther\b/.test(text)) return [{ type: 'zoom', direction: 'out' }]
  if (/\b(reset|center|fit)\b.*\bview\b|\bzoom reset\b/.test(text))
    return [{ type: 'zoom', direction: 'reset' }]

  /* --- connect A [pin] to B [pin] ---------------------------------- */
  const connect = text.match(/\bconnect\b(.+?)\bto\b(.+)/) ?? text.match(/\b(?:wire|hook|join|link)\b(.+?)\b(?:to|with|and)\b(.+)/)
  if (connect) {
    const from = parsePinRef(connect[1])
    const to = parsePinRef(connect[2])
    if (from && to) return [{ type: 'connect', from, to }]
    return null // recognized the verb but couldn't resolve parts → let the LLM try
  }

  /* --- add / place a component ------------------------------------- */
  const add = text.match(/\b(?:add|place|put|drop|insert|give me|create)\b(.+)/)
  if (add) {
    const id = resolveComponentId(add[1])
    if (id) return [{ type: 'add', componentId: id }]
    return null
  }

  /* --- delete / remove a component --------------------------------- */
  const del = text.match(/\b(?:delete|remove|take out|get rid of)\b(.+)/)
  if (del) {
    const id = resolveComponentId(del[1])
    const ordinal = parseOrdinal(del[1])
    const component: ComponentRef | undefined = id ? { componentId: id, ordinal } : undefined
    return [{ type: 'delete', component }]
  }

  /* --- press / push a button --------------------------------------- */
  if (/\b(press|push|click|hold)\b/.test(text)) {
    const id = resolveComponentId(text) ?? 'button'
    return [{ type: 'press', component: { componentId: id, ordinal: parseOrdinal(text) } }]
  }

  return null
}

/** Resolve one side of a "connect ... to ..." phrase into a pin reference. */
function parsePinRef(phrase: string): PinRef | null {
  const componentId = resolveComponentId(phrase)
  if (!componentId) return null
  return {
    component: { componentId, ordinal: parseOrdinal(phrase) },
    // The whole phrase is the pin hint; resolvePinIndex extracts polarity /
    // lead-letter / number cues from it.
    pinHint: phrase.trim(),
  }
}
