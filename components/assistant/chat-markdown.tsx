'use client'

import * as React from 'react'
import { makeStyles, tokens } from '@fluentui/react-components'

const useStyles = makeStyles({
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
})

function renderInline(text: string, key: React.Key) {
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

/** Lightweight Markdown-ish renderer shared by the tutor and the floating assistant. */
export function ChatMarkdown({ text }: { text: string }) {
  const classes = useStyles()
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

/** Concatenate the text parts of a UI message. */
export function messageText(message: { parts: Array<{ type: string; text?: string }> }) {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('')
}
