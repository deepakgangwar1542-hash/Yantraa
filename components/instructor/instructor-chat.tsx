'use client'

import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  makeStyles,
  tokens,
  Textarea,
  Button,
  Tooltip,
  Title2,
  Body1,
  Caption1,
  Avatar,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
} from '@fluentui/react-components'
import {
  Send24Filled,
  BrainCircuit24Filled,
  Person24Regular,
  Lightbulb20Regular,
  Stop24Filled,
  Mic24Filled,
  Mic24Regular,
  Speaker224Filled,
  Speaker224Regular,
} from '@fluentui/react-icons'
import { ChatMarkdown, messageText } from '@/components/assistant/chat-markdown'
import { useSpeechRecognition, useSpeechSynthesis } from '@/lib/speech'
import { SIGNAL, GLOW, MONO_STACK, EASE_ELECTRIC } from '@/lib/theme'

const SUGGESTIONS = [
  'What is Ohm\u2019s Law and why do I need it?',
  'How do I safely wire an LED with a resistor?',
  'Explain what a breadboard is like I\u2019m five.',
  'What\u2019s the difference between a diode and a transistor?',
]

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
  scroll: {
    flexGrow: 1,
    overflowY: 'auto',
    paddingLeft: tokens.spacingHorizontalXL,
    paddingRight: tokens.spacingHorizontalXL,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
  },
  inner: {
    maxWidth: '780px',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    paddingLeft: tokens.spacingHorizontalXL,
    paddingRight: tokens.spacingHorizontalXL,
    borderRadius: '10px',
    // Soft PCB vignette so the schematic ambient dims under the hero copy for
    // legibility, while still bleeding through at the edges.
    backgroundImage:
      'radial-gradient(ellipse 96% 72% at 50% 44%, rgba(9,11,13,0.94) 0%, rgba(9,11,13,0.86) 48%, rgba(9,11,13,0.35) 74%, transparent 100%)',
  },
  // IC-chip brand mark: dark package, signal-red die, breathing glow + pin rails.
  heroMark: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    width: '64px',
    height: '64px',
    borderRadius: '8px',
    color: '#fff',
    border: `1px solid ${SIGNAL.red}`,
    backgroundColor: '#141416',
    backgroundImage: `radial-gradient(circle at 50% 45%, rgba(255,45,45,0.55), rgba(255,45,45,0.08) 60%, transparent 72%)`,
    boxShadow: GLOW.md,
    animationName: 'trace-pulse',
    animationDuration: '3.6s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
  },
  suggestions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: tokens.spacingHorizontalM,
    width: '100%',
    marginTop: tokens.spacingVerticalM,
  },
  suggestionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    textAlign: 'left',
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    cursor: 'pointer',
    transform: 'translateY(0)',
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'background-color, border-color, transform',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      borderTopColor: SIGNAL.red,
      borderRightColor: SIGNAL.red,
      borderBottomColor: SIGNAL.red,
      borderLeftColor: SIGNAL.red,
      transform: 'translateY(-2px)',
    },
  },
  // "Current flowing" thinking indicator — dots pulse along a trace.
  thinking: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    height: '20px',
    fontFamily: MONO_STACK,
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: tokens.colorNeutralForeground3,
  },
  thinkingDots: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
  thinkingDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: SIGNAL.red,
    animationName: 'trace-pulse',
    animationDuration: '1.1s',
    animationIterationCount: 'infinite',
    animationTimingFunction: EASE_ELECTRIC,
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
      opacity: 0.7,
    },
  },
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'flex-start',
  },
  rowUser: {
    flexDirection: 'row-reverse',
  },
  bubble: {
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusXLarge,
    maxWidth: '100%',
  },
  // Student message: energized signal-red with a soft current glow.
  bubbleUser: {
    backgroundColor: SIGNAL.red,
    color: '#fff',
    borderBottomRightRadius: tokens.borderRadiusSmall,
    boxShadow: GLOW.sm,
  },
  // Tutor message: matte PCB panel with a faint red-tinted trace border.
  bubbleAssistant: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid rgba(255,70,58,0.16)`,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
  },
  // Tutor avatar as a small IC chip.
  botAvatar: {
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    color: '#fff',
    border: `1px solid ${SIGNAL.red}`,
    backgroundColor: '#141416',
    backgroundImage: `radial-gradient(circle at 50% 45%, rgba(255,45,45,0.5), transparent 72%)`,
    boxShadow: GLOW.sm,
  },
  composer: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    paddingLeft: tokens.spacingHorizontalXL,
    paddingRight: tokens.spacingHorizontalXL,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
  },
  composerInner: {
    maxWidth: '780px',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
  },
  textarea: {
    flexGrow: 1,
  },
  listeningHint: {
    maxWidth: '780px',
    marginLeft: 'auto',
    marginRight: 'auto',
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
  disclaimer: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground4,
    marginTop: tokens.spacingVerticalXS,
  },
})

/** Branded "thinking" readout: three dots pulsing like current on a trace. */
function TraceThinking({ className, dotClassName, dotsClassName }: {
  className: string
  dotsClassName: string
  dotClassName: string
}) {
  return (
    <span className={className} role="status" aria-label="Circuit is thinking">
      <span aria-hidden>Analyzing</span>
      <span className={dotsClassName} aria-hidden>
        <span className={dotClassName} style={{ animationDelay: '0ms' }} />
        <span className={dotClassName} style={{ animationDelay: '160ms' }} />
        <span className={dotClassName} style={{ animationDelay: '320ms' }} />
      </span>
    </span>
  )
}

export function InstructorChat() {
  const styles = useStyles()
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })
  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  // Speech: mic input + speak-aloud output.
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
  }, [messages, status])

  // Speak newly completed assistant answers when speak-aloud is on.
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
        // Don't replay history: treat the latest answer as already spoken.
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

  return (
    <div className={styles.root}>
      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.inner}>
          {messages.length === 0 ? (
            <div className={styles.hero}>
              <span className={styles.heroMark} aria-hidden>
                <BrainCircuit24Filled fontSize={32} />
              </span>
              <Title2>Meet Circuit, your hardware tutor</Title2>
              <Body1 style={{ color: tokens.colorNeutralForeground3, maxWidth: '520px' }}>
                Ask anything about electronic components, from the very basics to advanced theory.
                Type or use the mic, in any language. No question is too simple.
              </Body1>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.suggestionCard}
                    onClick={() => submit(s)}
                  >
                    <Lightbulb20Regular
                      style={{ color: tokens.colorBrandForeground1, flexShrink: 0 }}
                    />
                    <Caption1>{s}</Caption1>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user'
              const text = messageText(m)
              return (
                <div
                  key={m.id}
                  className={`${styles.row} ${isUser ? styles.rowUser : ''}`}
                >
                  {isUser ? (
                    <Avatar
                      size={32}
                      icon={<Person24Regular />}
                      color="neutral"
                      aria-label="You"
                    />
                  ) : (
                    <span className={styles.botAvatar} aria-hidden>
                      <BrainCircuit24Filled fontSize={18} />
                    </span>
                  )}
                  <div
                    className={`${styles.bubble} ${
                      isUser ? styles.bubbleUser : styles.bubbleAssistant
                    }`}
                  >
                    {isUser ? <Body1 style={{ color: 'inherit' }}>{text}</Body1> : (
                      text ? (
                        <ChatMarkdown text={text} />
                      ) : (
                        <TraceThinking
                          className={styles.thinking}
                          dotsClassName={styles.thinkingDots}
                          dotClassName={styles.thinkingDot}
                        />
                      )
                    )}
                  </div>
                </div>
              )
            })
          )}
          {busy && messages[messages.length - 1]?.role === 'user' && (
            <div className={styles.row}>
              <span className={styles.botAvatar} aria-hidden>
                <BrainCircuit24Filled fontSize={18} />
              </span>
              <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
                <TraceThinking
                  className={styles.thinking}
                  dotsClassName={styles.thinkingDots}
                  dotClassName={styles.thinkingDot}
                />
              </div>
            </div>
          )}

          {error && !busy && (
            <MessageBar intent="error" layout="multiline">
              <MessageBarBody>
                <MessageBarTitle
                  style={{ fontFamily: MONO_STACK, letterSpacing: '0.08em' }}
                >
                  ERR · NO RESPONSE
                </MessageBarTitle>
                {error.message || 'Something went wrong contacting the tutor. Please try again.'}
              </MessageBarBody>
              <MessageBarActions>
                <Button
                  appearance="transparent"
                  size="small"
                  onClick={() => regenerate()}
                >
                  Try again
                </Button>
              </MessageBarActions>
            </MessageBar>
          )}
        </div>
      </div>

      <div className={styles.composer}>
        {listening && (
          <Caption1 as="p" className={styles.listeningHint}>
            <Mic24Filled fontSize={16} className={styles.micLive} />
            {interim ? interim : 'Listening\u2026 speak now'}
          </Caption1>
        )}
        <div className={styles.composerInner}>
          <Tooltip
            content={
              !ttsSupported
                ? 'Speak-aloud is not supported in this browser'
                : speakOn
                  ? 'Turn off speak-aloud'
                  : 'Speak answers aloud'
            }
            relationship="label"
          >
            <Button
              appearance={speakOn ? 'primary' : 'subtle'}
              icon={speakOn ? <Speaker224Filled /> : <Speaker224Regular />}
              onClick={toggleSpeak}
              disabled={!ttsSupported}
              aria-label="Toggle speak answers aloud"
              aria-pressed={speakOn}
            />
          </Tooltip>
          <Textarea
            className={styles.textarea}
            value={input}
            resize="vertical"
            placeholder={'Ask Circuit in any language\u2026'}
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
                ? 'Microphone input is not supported in this browser'
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
        <Caption1 as="p" className={styles.disclaimer}>
          Circuit is an AI tutor and can make mistakes. Always double-check safety-critical wiring.
        </Caption1>
      </div>
    </div>
  )
}
