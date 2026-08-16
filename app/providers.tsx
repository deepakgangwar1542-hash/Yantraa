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
/* YANTRAA brand — "a powered PCB on a dark lab bench"                  */
/* ------------------------------------------------------------------ */
/*
 * Signal red: #ff2d2d (slot 100) — means "live / active / current flowing".
 * The ramp runs from deep oxblood (surfaces / text-on-red) up through the
 * signal red core to a hot highlight (#ff5c4d, slot 120) and soft pinks for
 * dark-theme foregrounds. Fluent maps this into both themes; key brand tokens
 * are then pinned explicitly below so the "live" red is exact and predictable.
 */
export const YANTRAA_RED = '#ff2d2d'

const brandRed: BrandVariants = {
  10: '#060000',
  20: '#2a0304',
  30: '#470507',
  40: '#61060a',
  50: '#7a1210', // cooled trace — inactive / disabled brand
  60: '#99060f',
  70: '#b80712',
  80: '#d50e1c',
  90: '#f01f26',
  100: '#ff2d2d', // core signal red
  110: '#ff4438',
  120: '#ff5c4d', // hot highlight — hover / peak glow
  130: '#ff7a6b',
  140: '#ff9d91',
  150: '#ffc3bb',
  160: '#ffe7e3',
}

/* PCB substrate: near-black, faintly warm — never neutral gray. */
const carbon = {
  page: '#0b0d0f', // base canvas
  surface: '#121417', // panel level 1
  surfaceHover: '#191b1f', // panel level 2 / raised
  elevated: '#191b1f',
  elevatedHover: '#20232a',
  stroke1: 'rgba(255,70,58,0.16)', // faintly luminous red-tinted hairline
  stroke2: 'rgba(255,255,255,0.07)',
  strokeAccessible: 'rgba(255,120,110,0.34)',
  text1: '#F4F5F7',
  text2: '#AEB2BA',
  text3: '#767B85',
  text4: '#555A63',
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
  colorBrandForeground1: '#cc1414',
  colorBrandForeground2: '#a81010',
  colorBrandBackground: '#e01414',
  colorBrandBackgroundHover: '#ff2d2d',
  fontFamilyBase:
    "var(--font-sans), 'Inter', 'IBM Plex Sans', system-ui, -apple-system, sans-serif",
  fontFamilyMonospace:
    "var(--font-mono), 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
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
  // Brand surfaces pinned to the exact signal red so "live" is precise.
  colorBrandBackground: '#ff2d2d',
  colorBrandBackgroundHover: '#ff5c4d',
  colorBrandBackgroundPressed: '#d50e1c',
  colorBrandBackgroundSelected: '#ff2d2d',
  colorCompoundBrandBackground: '#ff2d2d',
  colorCompoundBrandBackgroundHover: '#ff5c4d',
  colorCompoundBrandBackgroundPressed: '#d50e1c',
  colorBrandStroke1: '#ff2d2d',
  colorBrandStroke2: '#7a1210',
  colorCompoundBrandStroke: '#ff4438',
  colorCompoundBrandStrokeHover: '#ff5c4d',
  // Brand foreground reads as a bright signal red on carbon.
  colorBrandForeground1: '#ff5c4d',
  colorBrandForeground2: '#ff7a6b',
  colorBrandForegroundLink: '#ff6f60',
  colorBrandForegroundLinkHover: '#ff8a7d',
  // Instrument typography: Inter for UI, JetBrains Mono for readouts.
  fontFamilyBase:
    "var(--font-sans), 'Inter', 'IBM Plex Sans', system-ui, -apple-system, sans-serif",
  fontFamilyMonospace:
    "var(--font-mono), 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
  // Crisp instrument corners — never the soft "friendly app" radius.
  borderRadiusMedium: '4px',
  borderRadiusLarge: '5px',
  borderRadiusXLarge: '6px',
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
