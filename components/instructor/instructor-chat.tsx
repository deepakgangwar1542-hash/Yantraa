'use client'

import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  makeStyles,
  tokens,
  Textarea,
  Button,
  Title2,
  Body1,
  Caption1,
  Spinner,
  Avatar,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
  Link,
} from '@fluentui/react-components'
import {
  Send24Filled,
  BrainCircuit24Filled,
  Person24Regular,
  Lightbulb20Regular,
  Stop24Filled,
} from '@fluentui/react-icons'

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
    paddingBottom: tokens.spacingVerticalL,
  },
  heroMark: {
    display: 'grid',
    placeItems: 'center',
    width: '64px',
    height: '64px',
    borderRadius: tokens.borderRadiusXLarge,
    color: tokens.colorNeutralForegroundOnBrand,
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground}, ${tokens.colorPaletteTealBackground2})`,
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
      border: `1px solid ${tokens.colorBrandStroke1}`,
      transform: 'translateY(-2px)',
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
  bubbleUser: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderBottomRightRadius: tokens.borderRadiusSmall,
  },
  bubbleAssistant: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottomLeftRadius: tokens.borderRadiusSmall,
  },
  botAvatar: {
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorNeutralForegroundOnBrand,
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground}, ${tokens.colorPaletteTealBackground2})`,
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
  // markdown-ish text
  md: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  mdHeading: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    marginTop: tokens.spacingVerticalXS,
  },
  bullet: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    paddingLeft: tokens.spacingHorizontalXS,
  },
  dot: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightBold,
  },
  disclaimer: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground4,
    marginTop: tokens.spacingVerticalXS,
  },
})

function renderInline(text: string, key: React.Key) {
  // bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span key={key}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </span>
  )
}

function Markdownish({ text, classes }: { text: string; classes: ReturnType<typeof useStyles> }) {
  const lines = text.split('\n')
  return (
    <div className={classes.md}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd()
        if (!line.trim()) return null
        const heading = line.match(/^#{1,3}\s+(.*)/)
        if (heading) {
          return (
            <div key={i} className={classes.mdHeading}>
              {renderInline(heading[1], i)}
            </div>
          )
        }
        const bullet = line.match(/^\s*[-*]\s+(.*)/)
        if (bullet) {
          return (
            <div key={i} className={classes.bullet}>
              <span className={classes.dot}>&bull;</span>
              <span>{renderInline(bullet[1], i)}</span>
            </div>
          )
        }
        const numbered = line.match(/^\s*(\d+)\.\s+(.*)/)
        if (numbered) {
          return (
            <div key={i} className={classes.bullet}>
              <span className={classes.dot}>{numbered[1]}.</span>
              <span>{renderInline(numbered[2], i)}</span>
            </div>
          )
        }
        return <div key={i}>{renderInline(line, i)}</div>
      })}
    </div>
  )
}

function messageText(message: { parts: Array<{ type: string; text?: string }> }) {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('')
}

export function InstructorChat() {
  const styles = useStyles()
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })
  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, status])

  const submit = React.useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return
      sendMessage({ text: trimmed })
      setInput('')
    },
    [busy, sendMessage],
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
                No question is too simple. Pick a starter below or type your own.
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
                        <Markdownish text={text} classes={styles} />
                      ) : (
                        <Spinner size="tiny" label={'Thinking\u2026'} />
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
                <Spinner size="tiny" label={'Thinking\u2026'} />
              </div>
            </div>
          )}

          {error && !busy && (() => {
            const msg = error.message || 'Something went wrong contacting the tutor.'
            const needsCard = /credit card/i.test(msg)
            const linkMatch = msg.match(/https?:\/\/\S+/)
            return (
              <MessageBar intent="error" layout="multiline">
                <MessageBarBody>
                  <MessageBarTitle>
                    {needsCard
                      ? 'AI tutor is not activated yet'
                      : 'Circuit could not respond'}
                  </MessageBarTitle>
                  {needsCard ? (
                    <>
                      {'The AI Gateway needs a valid credit card on file to unlock your free credits. '}
                      {linkMatch ? (
                        <Link href={linkMatch[0]} target="_blank" rel="noreferrer">
                          Add a card to activate the tutor
                        </Link>
                      ) : null}
                      {'. This is a one-time setup and no charge is made until you exceed the free credits.'}
                    </>
                  ) : (
                    msg
                  )}
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
            )
          })()}
        </div>
      </div>

      <div className={styles.composer}>
        <div className={styles.composerInner}>
          <Textarea
            className={styles.textarea}
            value={input}
            resize="vertical"
            placeholder={'Ask Circuit about any component or concept\u2026'}
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
