'use client'

import * as React from 'react'

/* ------------------------------------------------------------------ */
/* Language detection (script-first, keyword fallback)                 */
/* Good enough to pick a matching TTS voice / recognition locale.      */
/* ------------------------------------------------------------------ */

/**
 * Best-effort BCP-47 language guess for a chunk of text. Returns undefined
 * when it can't tell (caller should then fall back to the browser default).
 */
export function detectLang(text: string): string | undefined {
  if (!text) return undefined

  // Distinct scripts are unambiguous — check these first.
  if (/[\u0900-\u097F]/.test(text)) return 'hi' // Devanagari (Hindi/Marathi)
  if (/[\u0980-\u09FF]/.test(text)) return 'bn' // Bengali
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa' // Gurmukhi (Punjabi)
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu' // Gujarati
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta' // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te' // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn' // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml' // Malayalam
  if (/[\u0600-\u06FF]/.test(text)) return 'ar' // Arabic / Urdu
  if (/[\u0590-\u05FF]/.test(text)) return 'he' // Hebrew
  if (/[\u0400-\u04FF]/.test(text)) return 'ru' // Cyrillic (Russian)
  if (/[\u0370-\u03FF]/.test(text)) return 'el' // Greek
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th' // Thai
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return 'ko' // Korean
  if (/[\u3040-\u30FF]/.test(text)) return 'ja' // Japanese kana
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh' // CJK (after kana → Chinese)

  // Latin-script languages: require >=2 stop-word hits to avoid misfiring
  // on English text that happens to contain a stray "la" or "el".
  const low = ` ${text.toLowerCase().replace(/[^\p{L}\s]/gu, ' ')} `
  const count = (words: string[]) =>
    words.reduce((n, w) => (low.includes(` ${w} `) ? n + 1 : n), 0)

  const scores: Record<string, number> = {
    es: count(['el', 'los', 'las', 'una', 'que', 'para', 'con', 'cómo', 'qué', 'por', 'es', 'y']),
    fr: count(['le', 'les', 'une', 'des', 'que', 'pour', 'avec', 'comment', 'vous', 'est', 'je', 'et']),
    de: count(['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'mit', 'für', 'wie', 'nicht', 'ich']),
    pt: count(['os', 'as', 'um', 'uma', 'que', 'para', 'com', 'como', 'você', 'não', 'de', 'e']),
    it: count(['il', 'lo', 'gli', 'una', 'che', 'per', 'con', 'come', 'sono', 'non', 'di', 'e']),
  }
  let best: string | undefined
  let bestScore = 1 // must beat threshold of >=2
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = lang
      bestScore = score
    }
  }
  return best
}

/** Strip Markdown so the speech output sounds natural. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ------------------------------------------------------------------ */
/* Text-to-speech (speak the answer aloud)                             */
/* ------------------------------------------------------------------ */

export function useSpeechSynthesis() {
  const [supported, setSupported] = React.useState(false)
  const [speaking, setSpeaking] = React.useState(false)
  const voicesRef = React.useRef<SpeechSynthesisVoice[]>([])

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices()
    }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      window.speechSynthesis.cancel()
    }
  }, [])

  const pickVoice = React.useCallback((lang?: string) => {
    const voices = voicesRef.current
    if (!voices.length || !lang) return undefined
    const l = lang.toLowerCase()
    return (
      voices.find((v) => v.lang.toLowerCase() === l) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(l)) ||
      voices.find((v) => v.lang.toLowerCase().split('-')[0] === l.split('-')[0])
    )
  }, [])

  const speak = React.useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      const clean = cleanForSpeech(text)
      if (!clean) return
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(clean)
      const lang = detectLang(clean)
      if (lang) utter.lang = lang
      const voice = pickVoice(lang)
      if (voice) utter.voice = voice
      utter.rate = 1
      utter.pitch = 1
      utter.onstart = () => setSpeaking(true)
      utter.onend = () => setSpeaking(false)
      utter.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utter)
    },
    [pickVoice],
  )

  const cancel = React.useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return { supported, speaking, speak, cancel }
}

/* ------------------------------------------------------------------ */
/* Speech-to-text (mic input)                                          */
/* ------------------------------------------------------------------ */

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
type SpeechRecognitionResultEvent = {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

export function useSpeechRecognition(onFinal?: (text: string) => void) {
  const [supported, setSupported] = React.useState(false)
  const [listening, setListening] = React.useState(false)
  const [interim, setInterim] = React.useState('')
  const recRef = React.useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = React.useRef(onFinal)
  onFinalRef.current = onFinal

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition
    if (!Ctor) return
    setSupported(true)
    const rec = new Ctor()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US'
    rec.onresult = (e) => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      setInterim(interimText)
      if (finalText) {
        onFinalRef.current?.(finalText.trim())
        setInterim('')
      }
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
    }
    rec.onerror = () => {
      setListening(false)
      setInterim('')
    }
    recRef.current = rec
    return () => {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
      recRef.current = null
    }
  }, [])

  const start = React.useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    try {
      rec.start()
      setListening(true)
    } catch {
      /* already started */
    }
  }, [])

  const stop = React.useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    try {
      rec.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
  }, [])

  const toggle = React.useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { supported, listening, interim, start, stop, toggle }
}
