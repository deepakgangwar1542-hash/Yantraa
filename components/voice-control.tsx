'use client'

import * as React from 'react'
import { makeStyles, tokens, Text } from '@fluentui/react-components'
import { Mic24Filled, Dismiss20Regular } from '@fluentui/react-icons'
import { STATUS, MONO_STACK, PCB } from '@/lib/theme'
import {
  labBus,
  labSnapshot,
  describeBoard,
  summarizeActions,
  type LabAction,
} from '@/lib/lab-actions'
import { parseVoiceCommand } from '@/lib/voice-parser'

/* ------------------------------------------------------------------ */
/* Context                                                            */
/* ------------------------------------------------------------------ */

interface VoiceControlValue {
  enabled: boolean
  setEnabled: (on: boolean) => void
  supported: boolean
}

const VoiceControlContext = React.createContext<VoiceControlValue>({
  enabled: false,
  setEnabled: () => {},
  supported: false,
})

export function useVoiceControl() {
  return React.useContext(VoiceControlContext)
}

type VoiceStatus = 'idle' | 'listening' | 'armed' | 'thinking' | 'done' | 'error'

const WAKE_WORDS = ['hey circuit', 'hey circus', 'a circuit', 'okay circuit', 'circuit']

/** Minimal shape of the Web Speech API we rely on (not in TS lib DOM by default). */
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
interface SpeechRecognitionResultEvent {
  resultIndex: number
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>
}

/* ------------------------------------------------------------------ */
/* Provider                                                           */
/* ------------------------------------------------------------------ */

export function VoiceControlProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles()
  const [enabled, setEnabled] = React.useState(false)
  const [status, setStatus] = React.useState<VoiceStatus>('idle')
  const [heard, setHeard] = React.useState('') // what the user said
  const [reply, setReply] = React.useState('') // assistant confirmation

  const supported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const recRef = React.useRef<SpeechRecognitionLike | null>(null)
  const armedRef = React.useRef(false) // heard wake word, waiting for the command
  const armedTimer = React.useRef<number | null>(null)
  const busyRef = React.useRef(false) // ignore input while thinking / speaking
  const enabledRef = React.useRef(false)
  enabledRef.current = enabled

  const speak = React.useCallback((text: string) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1.05
      u.pitch = 1
      window.speechSynthesis.speak(u)
    } catch {
      /* speech synthesis is best-effort */
    }
  }, [])

  const runCommand = React.useCallback(
    async (command: string) => {
      const cmd = command.trim()
      if (!cmd) return
      busyRef.current = true
      setHeard(cmd)
      setReply('')
      setStatus('thinking')
      try {
        // 1) Fast local keyword parse.
        let actions: LabAction[] | null = parseVoiceCommand(cmd)
        let spoken = actions ? summarizeActions(actions) : ''

        // 2) Fall back to the LLM for natural phrasing.
        if (!actions || actions.length === 0) {
          const res = await fetch('/api/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            transcript: cmd,
            board: describeBoard(labSnapshot.get()),
          }),
          })
          const data = (await res.json()) as { actions?: LabAction[]; reply?: string }
          actions = data.actions ?? []
          spoken = data.reply || summarizeActions(actions)
        }

        if (actions.length > 0) labBus.emit(actions)
        const confirmation = spoken || 'Sorry, I didn\u2019t catch a command.'
        setReply(confirmation)
        setStatus(actions.length > 0 ? 'done' : 'error')
        speak(confirmation)
      } catch {
        const msg = 'Something went wrong running that command.'
        setReply(msg)
        setStatus('error')
        speak(msg)
      } finally {
        busyRef.current = false
        // Clear the caption after a beat so it doesn't linger.
        window.setTimeout(() => {
          if (enabledRef.current) setStatus('listening')
        }, 3200)
      }
    },
    [speak],
  )

  const handleTranscript = React.useCallback(
    (raw: string) => {
      if (busyRef.current) return
      const text = raw.toLowerCase().trim()
      if (!text) return

      // Already armed by a wake word → this utterance is the command.
      if (armedRef.current) {
        armedRef.current = false
        if (armedTimer.current) window.clearTimeout(armedTimer.current)
        void runCommand(text)
        return
      }

      // Look for a wake word; everything after it is the command.
      for (const wake of WAKE_WORDS) {
        const i = text.indexOf(wake)
        if (i >= 0) {
          const after = text.slice(i + wake.length).replace(/^[,\s]+/, '')
          if (after) {
            void runCommand(after)
          } else {
            // Wake word alone → arm for the next utterance.
            armedRef.current = true
            setStatus('armed')
            armedTimer.current = window.setTimeout(() => {
              armedRef.current = false
              if (enabledRef.current) setStatus('listening')
            }, 8000)
          }
          return
        }
      }
    },
    [runCommand],
  )

  // Own the SpeechRecognition lifecycle while enabled.
  React.useEffect(() => {
    if (!enabled || !supported) return
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition
    if (!Ctor) return

    let stopped = false
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i]
        if (r.isFinal) handleTranscript(r[0].transcript)
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setStatus('error')
        setReply('Microphone permission is blocked.')
        setEnabled(false)
      }
    }
    rec.onend = () => {
      // The engine stops itself periodically; restart until the user disables.
      if (!stopped && enabledRef.current) {
        try {
          rec.start()
        } catch {
          /* already starting */
        }
      }
    }
    recRef.current = rec
    try {
      rec.start()
      setStatus('listening')
    } catch {
      /* will retry via onend */
    }

    return () => {
      stopped = true
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
      recRef.current = null
      if (armedTimer.current) window.clearTimeout(armedTimer.current)
      armedRef.current = false
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
      setStatus('idle')
    }
  }, [enabled, supported, handleTranscript])

  const value = React.useMemo(
    () => ({ enabled, setEnabled, supported }),
    [enabled, supported],
  )

  const statusLabel: Record<VoiceStatus, string> = {
    idle: 'OFF',
    listening: 'LISTENING',
    armed: 'GO AHEAD',
    thinking: 'WORKING',
    done: 'DONE',
    error: 'RETRY',
  }
  const statusColor: Record<VoiceStatus, string> = {
    idle: tokens.colorNeutralForeground3,
    listening: STATUS.active,
    armed: STATUS.warning,
    thinking: STATUS.warning,
    done: STATUS.active,
    error: STATUS.error,
  }

  return (
    <VoiceControlContext.Provider value={value}>
      {children}
      {enabled && (
        <div className={styles.card} role="status" aria-live="polite">
          <div className={styles.bar}>
            <span
              className={styles.dot}
              style={{
                backgroundColor: statusColor[status],
                animation: status === 'listening' || status === 'thinking' ? 'voicePulse 1.4s infinite' : 'none',
              }}
              aria-hidden
            />
            <Mic24Filled style={{ fontSize: 18, color: statusColor[status] }} />
            <span className={styles.statusText} style={{ color: statusColor[status] }}>
              {statusLabel[status]}
            </span>
            <span className={styles.title}>VOICE</span>
            <button
              className={styles.close}
              onClick={() => setEnabled(false)}
              aria-label="Turn off voice control"
            >
              <Dismiss20Regular />
            </button>
          </div>
          <div className={styles.body}>
            {heard ? (
              <Text className={styles.heard}>&ldquo;{heard}&rdquo;</Text>
            ) : (
              <Text className={styles.hint}>
                Say &ldquo;Hey Circuit&rdquo; then a command &mdash; e.g. &ldquo;add a resistor&rdquo;.
              </Text>
            )}
            {reply && (
              <Text className={styles.reply} style={{ color: statusColor[status] }}>
                {reply}
              </Text>
            )}
          </div>
        </div>
      )}
      <style>{'@keyframes voicePulse{0%,100%{opacity:1}50%{opacity:0.35}}'}</style>
    </VoiceControlContext.Provider>
  )
}

const useStyles = makeStyles({
  card: {
    position: 'fixed',
    left: '50%',
    bottom: '18px',
    transform: 'translateX(-50%)',
    zIndex: 9002,
    width: 'min(360px, calc(100vw - 32px))',
    borderRadius: '8px',
    overflow: 'hidden',
    border: `1px solid ${PCB.strokeRed}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow28,
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 8px 7px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  dot: { width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0 },
  statusText: {
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1.5px',
  },
  title: {
    fontFamily: MONO_STACK,
    fontSize: '11px',
    letterSpacing: '2px',
    color: tokens.colorNeutralForeground3,
    marginLeft: 'auto',
  },
  close: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
  },
  body: { padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '4px' },
  heard: { fontSize: '14px', fontWeight: 600, color: tokens.colorNeutralForeground1 },
  hint: { fontSize: '12px', color: tokens.colorNeutralForeground3, lineHeight: 1.4 },
  reply: { fontSize: '12.5px', lineHeight: 1.4 },
})
