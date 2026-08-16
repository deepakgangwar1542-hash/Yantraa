'use client'

import * as React from 'react'
import {
  FluentProvider,
  SSRProvider,
  RendererProvider,
  createDOMRenderer,
  renderToStyleElements,
  createLightTheme,
  createDarkTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components'
import { useServerInsertedHTML } from 'next/navigation'

type ThemeMode = 'light' | 'dark'

/* ------------------------------------------------------------------ */
/* YANTRAA brand — "Red & Carbon"                                      */
/* ------------------------------------------------------------------ */
/*
 * Signature red: #E0112C (slot 90). The full ramp is derived from it —
 * deep oxblood shades below for surfaces/text-on-red, vivid reds in the
 * mid for accents/glows, soft pinks above for dark-theme foregrounds.
 * Fluent maps this ramp into both light and dark themes automatically.
 */
export const YANTRAA_RED = '#E0112C'

const brandRed: BrandVariants = {
  10: '#060000',
  20: '#250207',
  30: '#41040D',
  40: '#5A0511',
  50: '#750516',
  60: '#91041C',
  70: '#AE0521',
  80: '#CB0827',
  90: '#E0112C',
  100: '#E7324A',
  110: '#EE5063',
  120: '#F36F7E',
  130: '#F78E99',
  140: '#FAADB4',
  150: '#FCCBCF',
  160: '#FEE8EA',
}

/* Carbon neutral scale used to override Fluent's default grays in dark mode. */
const carbon = {
  page: '#0B0B0D',
  surface: '#131318',
  surfaceHover: '#1A1A20',
  elevated: '#1B1B21',
  elevatedHover: '#232329',
  stroke1: 'rgba(255,255,255,0.14)',
  stroke2: 'rgba(255,255,255,0.08)',
  strokeAccessible: 'rgba(255,255,255,0.28)',
  text1: '#FFFFFF',
  text2: '#B9B9C2',
  text3: '#7A7A85',
  text4: '#5A5A63',
}

const baseLight = createLightTheme(brandRed)
const baseDark = createDarkTheme(brandRed)

export const yantraaLightTheme: Theme = {
  ...baseLight,
  colorNeutralBackground1: '#FFFFFF',
  colorNeutralBackground2: '#FAFAFA',
  colorNeutralBackground3: '#F2F2F4',
  colorNeutralForeground1: '#1A1A1A',
  colorNeutralForeground2: '#3A3A40',
  colorNeutralForeground3: '#5A5A66',
  // Keep the brand foreground a readable deep red on light surfaces.
  colorBrandForeground1: '#B30E24',
  colorBrandForeground2: '#9A0D1F',
}

export const yantraaDarkTheme: Theme = {
  ...baseDark,
  // Carbon surface stack
  colorNeutralBackground1: carbon.surface,
  colorNeutralBackground1Hover: carbon.surfaceHover,
  colorNeutralBackground1Pressed: carbon.surface,
  colorNeutralBackground1Selected: carbon.surfaceHover,
  colorNeutralBackground2: carbon.page,
  colorNeutralBackground3: carbon.elevated,
  colorNeutralBackground3Hover: carbon.elevatedHover,
  colorNeutralBackground4: carbon.page,
  colorNeutralBackground5: carbon.elevated,
  colorSubtleBackgroundHover: carbon.surfaceHover,
  colorSubtleBackgroundPressed: carbon.elevated,
  // Hairline strokes
  colorNeutralStroke1: carbon.stroke1,
  colorNeutralStroke2: carbon.stroke2,
  colorNeutralStroke3: carbon.stroke2,
  colorNeutralStrokeAccessible: carbon.strokeAccessible,
  // Text tiers
  colorNeutralForeground1: carbon.text1,
  colorNeutralForeground2: carbon.text2,
  colorNeutralForeground3: carbon.text3,
  colorNeutralForeground4: carbon.text4,
  // Brand foreground reads as a bright red on carbon
  colorBrandForeground1: '#F0637A',
  colorBrandForeground2: '#F78E99',
}

const ThemeModeContext = React.createContext<{
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}>({ mode: 'dark', setMode: () => {}, toggle: () => {} })

export function useThemeMode() {
  return React.useContext(ThemeModeContext)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [renderer] = React.useState(() => createDOMRenderer())
  const didRenderRef = React.useRef(false)
  const [mode, setMode] = React.useState<ThemeMode>('dark')

  const toggle = React.useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), [])

  useServerInsertedHTML(() => {
    if (didRenderRef.current) {
      return
    }
    didRenderRef.current = true
    return <>{renderToStyleElements(renderer)}</>
  })

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <ThemeModeContext.Provider value={{ mode, setMode, toggle }}>
          <FluentProvider
            theme={mode === 'light' ? yantraaLightTheme : yantraaDarkTheme}
            id="__fluent-root"
          >
            {children}
          </FluentProvider>
        </ThemeModeContext.Provider>
      </SSRProvider>
    </RendererProvider>
  )
}
