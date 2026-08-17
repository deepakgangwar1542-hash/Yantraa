'use client'

import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import {
  makeStyles,
  tokens,
  Textarea,
  Button,
  Tooltip,
  Caption1,
  Body1,
  Spinner,
} from '@fluentui/react-components'
import {
  Send24Filled,
  Stop24Filled,
  Dismiss24Regular,
  BrainCircuit24Filled,
  Chat24Filled,
  Mic24Filled,
  Mic24Regular,
  Speaker224Filled,
  Speaker224Regular,
} from '@fluentui/react-icons'
import { ChatMarkdown, messageText } from '@/components/assistant/chat-markdown'
import { useSpeechRecognition, useSpeechSynthesis } from '@/lib/speech'

export type AssistantContext = 'library' | 'lab'

const COPY: Record<AssistantContext, { title: string; greeting: string; placeholder: string }> = {
  library: {
    title: 'Ask Circuit',
    greeting:
      'Hi! I can explain any component you are looking at, compare parts, or help you pick the right one. Ask me anything, in any language.',
    placeholder: 'Ask about a component\u2026',
  },
  lab: {
    title: 'Ask Circuit',
    greeting:
      'Hi! Building a circuit? I can help with wiring, pin connections, resistor values, and why something is not working. Ask me anything, in any language.',
    placeholder: 'Ask about your circuit\u2026',
  },
}

const useStyles = makeStyles({
  fab: {
    position: 'absolute',
    right: tokens.spacingHorizontalXL,
    bottom: tokens.spacingVerticalXL,
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    height: '52px',
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusCircular,
    border: 'none',
    cursor: 'pointer',
    color: tokens.colorNeutralForegroundOnBrand,
    background: `linear-gradient(135deg, #FF3B54, ${tokens.colorBrandBackground} 55%, #7A011C)`,
    boxShadow: tokens.shadow16,
    transform: 'translateY(0) scale(1)',
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'transform, box-shadow',
    ':hover': {
      transform: 'translateY(-2px) scale(1.03)',
      boxShadow: tokens.shadow28,
    },
    ':active': {
      transform: 'scale(0.97)',
    },
    '@media (prefers-reduced-motion: reduce)': {
      transform: 'none',
    },
  },
  fabLabel: {
    fontWeight: tokens.fontWeightSemibold,
  },
  panel: {
    position: 'absolute',
    right: tokens.spacingHorizontalXL,
    bottom: tokens.spacingVerticalXL,
    zIndex: 31,
    display: 'flex',
    flexDirection: 'column',
    width: 'min(390px, calc(100vw - 32px))',
    height: 'min(560px, calc(100dvh - 140px))',
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow28,
    overflow: 'hidden',
    animationName: {
      from: { opacity: 0, transform: 'translateY(16px) scale(0.98)' },
      to: { opacity: 1, transform: 'translateY(0) scale(1)' },
    },
    animationDuration: tokens.durationGentle,
    animationTimingFunction: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerMark: {
    display: 'grid',
    placeItems: 'center',
    width: '30px',
    height: '30px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorNeutralForegroundOnBrand,
    background: `linear-gradient(135deg, #FF3B54, ${tokens.colorBrandBackground} 55%, #7A011C)`,
  },
  headerText: {
    flexGrow: 1,
    minWidth: 0,
    fontWeight: tokens.fontWeightSemibold,
  },
  scroll: {
    flexGrow: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
  },
  greeting: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
  },
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
  },
  rowUser: {
    flexDirection: 'row-reverse',
  },
  bubble: {
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    maxWidth: '85%',
  },
  bubbleUser: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderBottomRightRadius: tokens.borderRadiusSmall,
  },
  bubbleAssistant: {
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
  },
  botMark: {
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    width: '26px',
    height: '26px',
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorNeutralForegroundOnBrand,
    background: `linear-gradient(135deg, #FF3B54, ${tokens.colorBrandBackground} 55%, #7A011C)`,
  },
  composer: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
  },
  listeningHint: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorBrandForeground1,
    paddingBottom: tokens.spacingVerticalXS,
  },
  micLive: {
    animationName: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.35 },
    },
    animationDuration: '1.1s',
    animationIterationCount: 'infinite',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
  },
  composerRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalXS,
  },
  textarea: {
    flexGrow: 1,
  },
})

export function FloatingAssistant({ context }: { context: AssistantContext }) {
  const styles = useStyles()
  const [open, setOpen] = React.useState(false)
  const copy = COPY[context]

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })
  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  const {
    supported: micSupported,
    listening,
    interim,
    toggle: toggleMic,
    stop: stopMic,
  } = useSpeechRecognition((text) =>
    setInput((prev) => (prev ? `${prev.trim()} ${text}` : text)),
  )
  const { supported: ttsSupported, speak, cancel: cancelSpeech } = useSpeechSynthesis()
  const [speakOn, setSpeakOn] = React.useState(false)
  const lastSpokenRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, status, open])

  React.useEffect(() => {
    if (!speakOn || !ttsSupported || busy) return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return
    if (lastSpokenRef.current === last.id) return
    const text = messageText(last)
    if (!text) return
    lastSpokenRef.current = last.id
    speak(text)
  }, [messages, busy, speakOn, ttsSupported, speak])

  const toggleSpeak = React.useCallback(() => {
    setSpeakOn((on) => {
      const next = !on
      if (!next) {
        cancelSpeech()
      } else {
        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
        lastSpokenRef.current = lastAssistant?.id ?? null
      }
      return next
    })
  }, [messages, cancelSpeech])

  const submit = React.useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return
      if (listening) stopMic()
      cancelSpeech()
      sendMessage({ text: trimmed })
      setInput('')
    },
    [busy, sendMessage, listening, stopMic, cancelSpeech],
  )

  if (!open) {
    return (
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen(true)}
        aria-label="Open the Circuit assistant"
      >
        <Chat24Filled />
        <span className={styles.fabLabel}>Ask Circuit</span>
      </button>
    )
  }

  return (
    <section className={styles.panel} aria-label="Circuit assistant">
      <div className={styles.header}>
        <span className={styles.headerMark} aria-hidden>
          <BrainCircuit24Filled fontSize={16} />
        </span>
        <Caption1 className={styles.headerText}>{copy.title}</Caption1>
        <Tooltip
          content={ttsSupported ? (speakOn ? 'Turn off speak-aloud' : 'Speak answers aloud') : 'Not supported here'}
          relationship="label"
        >
          <Button
            size="small"
            appearance={speakOn ? 'primary' : 'subtle'}
            icon={speakOn ? <Speaker224Filled /> : <Speaker224Regular />}
            onClick={toggleSpeak}
            disabled={!ttsSupported}
            aria-label="Toggle speak answers aloud"
            aria-pressed={speakOn}
          />
        </Tooltip>
        <Button
          size="small"
          appearance="subtle"
          icon={<Dismiss24Regular />}
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
        />
      </div>

      <div className={styles.scroll} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className={styles.greeting}>
            <span className={styles.botMark} aria-hidden>
              <BrainCircuit24Filled fontSize={14} />
            </span>
            <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
              <Body1>{copy.greeting}</Body1>
            </div>
          </div>
        ) : (
          messages.map((m: UIMessage) => {
            const isUser = m.role === 'user'
            const text = messageText(m)
            return (
              <div key={m.id} className={`${styles.row} ${isUser ? styles.rowUser : ''}`}>
                {!isUser && (
                  <span className={styles.botMark} aria-hidden>
                    <BrainCircuit24Filled fontSize={14} />
                  </span>
                )}
                <div
                  className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}
                >
                  {isUser ? (
                    <Body1 style={{ color: 'inherit' }}>{text}</Body1>
                  ) : text ? (
                    <ChatMarkdown text={text} />
                  ) : (
                    <Spinner size="tiny" label={'Thinking\u2026'} />
                  )}
                </div>
              </div>
            )
          })
        )}
        {busy && messages[messages.length - 1]?.role === 'user' && (
          <div className={styles.row}>
            <span className={styles.botMark} aria-hidden>
              <BrainCircuit24Filled fontSize={14} />
            </span>
            <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
              <Spinner size="tiny" label={'Thinking\u2026'} />
            </div>
          </div>
        )}
        {error && !busy && (
          <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
            <Caption1 style={{ color: tokens.colorPaletteRedForeground1 }}>
              Circuit could not respond. Please try again.
            </Caption1>
          </div>
        )}
      </div>

      <div className={styles.composer}>
        {listening && (
          <Caption1 as="p" className={styles.listeningHint}>
            <Mic24Filled fontSize={14} className={styles.micLive} />
            {interim ? interim : 'Listening\u2026'}
          </Caption1>
        )}
        <div className={styles.composerRow}>
          <Textarea
            className={styles.textarea}
            value={input}
            resize="none"
            placeholder={copy.placeholder}
            onChange={(_, data) => setInput(data.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                (e as unknown as { keyCode: number }).keyCode !== 229
              ) {
                e.preventDefault()
                submit(input)
              }
            }}
          />
          <Tooltip
            content={
              !micSupported
                ? 'Mic not supported here'
                : listening
                  ? 'Stop listening'
                  : 'Speak your question'
            }
            relationship="label"
          >
            <Button
              appearance={listening ? 'primary' : 'subtle'}
              icon={listening ? <Mic24Filled /> : <Mic24Regular />}
              onClick={toggleMic}
              disabled={!micSupported}
              aria-label="Toggle microphone input"
              aria-pressed={listening}
            />
          </Tooltip>
          {busy ? (
            <Button
              appearance="secondary"
              icon={<Stop24Filled />}
              onClick={() => stop()}
              aria-label="Stop generating"
            />
          ) : (
            <Button
              appearance="primary"
              icon={<Send24Filled />}
              onClick={() => submit(input)}
              disabled={!input.trim()}
              aria-label="Send message"
            />
          )}
        </div>
      </div>
    </section>
  )
}
