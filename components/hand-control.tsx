'use client'

import * as React from 'react'
import { makeStyles, tokens, Text, Button, Tooltip, Spinner } from '@fluentui/react-components'
import { Dismiss20Regular, HandRight24Regular } from '@fluentui/react-icons'
import { loadHandLandmarker, analyzeHand, disposeHandLandmarker, type HandPose } from '@/lib/hand-tracking'

/* ------------------------------------------------------------------ */
/* Context                                                            */
/* ------------------------------------------------------------------ */

interface HandControlValue {
  enabled: boolean
  setEnabled: (on: boolean) => void
}

const HandControlContext = React.createContext<HandControlValue>({
  enabled: false,
  setEnabled: () => {},
})

export function useHandControl() {
  return React.useContext(HandControlContext)
}

type HandStatus = 'idle' | 'loading' | 'camera' | 'ready' | 'error'

/* ------------------------------------------------------------------ */
/* Event synthesis helpers                                            */
/* ------------------------------------------------------------------ */

const ACTIVE_POINTER_ID = 1

function dispatchPointer(type: string, x: number, y: number, buttons: number, target?: Element | null) {
  const t = target ?? document.elementFromPoint(x, y)
  if (!t) return
  // R3F calls setPointerCapture on the canvas it receives events for; make sure
  // any canvas we touch (even ones mounted after hand control was enabled) has
  // the capture stub so untrusted pointer events don't throw.
  shimElement(t)
  const ev = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pointerId: ACTIVE_POINTER_ID,
    pointerType: 'mouse',
    isPrimary: true,
    button: buttons > 0 ? 0 : -1,
    buttons,
  })
  // R3F raycasts from event.offsetX/offsetY. For synthetic (untrusted) events
  // the browser computes those relative to the dispatch target, but scales them
  // by the page zoom — at 125%/175% zoom or in high-DPI webviews the raycast
  // misses the component. Compute them explicitly so hand input lands where the
  // cursor is, regardless of zoom.
  try {
    const rect = t.getBoundingClientRect()
    Object.defineProperty(ev, 'offsetX', { value: x - rect.left })
    Object.defineProperty(ev, 'offsetY', { value: y - rect.top })
  } catch {
    // some environments expose offsetX as read-only; fall back to browser values
  }
  t.dispatchEvent(ev)
}

function dispatchClick(x: number, y: number, target: Element | null) {
  const t = target ?? document.elementFromPoint(x, y)
  if (!t) return
  const ev = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 0,
  })
  // Same zoom-safe offset treatment as dispatchPointer: R3F raycasts mesh
  // onClick handlers from this event's offsetX/offsetY, and browsers compute
  // those wrongly for untrusted events at non-100% zoom.
  try {
    const rect = t.getBoundingClientRect()
    Object.defineProperty(ev, 'offsetX', { value: x - rect.left })
    Object.defineProperty(ev, 'offsetY', { value: y - rect.top })
  } catch {
    // read-only in some environments; fall back to browser-computed values
  }
  t.dispatchEvent(ev)
}

/**
 * R3F (react-three-fiber) calls setPointerCapture/releasePointerCapture with the
 * synthetic pointer id. For a virtual pointer there is no active OS pointer, so
 * those calls throw. Stub them out on canvases (and the document) while hand
 * control is active so hand-driven canvas clicks, drags and orbits work.
 */
type ShimmedElement = Element &
  Partial<Pick<Element, 'setPointerCapture' | 'releasePointerCapture' | 'hasPointerCapture'>> & {
    __handShim?: boolean
  }
type ShimmedDocument = Document & {
  __handShim?: boolean
  setPointerCapture?: (id: number) => void
  releasePointerCapture?: (id: number) => void
  hasPointerCapture?: (id: number) => boolean
}

/** Stub pointer-capture on a single element (used on-the-fly so canvases that
 * mount after hand control turns on still work). */
function shimElement(el: unknown) {
  if (!el) return
  const node = el as ShimmedElement
  if (node.__handShim) return
  node.__handShim = true
  node.setPointerCapture = () => {}
  node.releasePointerCapture = () => {}
  node.hasPointerCapture = () => true
}

function installCaptureShim() {
  shimElement(document)
  document.querySelectorAll('canvas').forEach(shimElement)
}

function restoreCaptureShim() {
  document.querySelectorAll('canvas').forEach((el) => {
    const node = el as ShimmedElement
    if (node.__handShim) delete node.__handShim
  })
  const doc = document as ShimmedDocument
  if (doc.__handShim) {
    delete doc.__handShim
    if (doc.setPointerCapture) delete doc.setPointerCapture
    if (doc.releasePointerCapture) delete doc.releasePointerCapture
    if (doc.hasPointerCapture) delete doc.hasPointerCapture
  }
}

/** Nearest scrollable ancestor (or self) of an element. */
function findScrollable(el: Element | null): Element | null {
  let node: Element | null = el
  while (node && node !== document.body) {
    const s = node as HTMLElement
    if (s.scrollHeight > s.clientHeight + 4) return s
    node = node.parentElement
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Provider + overlay                                                 */
/* ------------------------------------------------------------------ */

const useStyles = makeStyles({
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9000,
    pointerEvents: 'none',
  },
  cursor: {
    position: 'fixed',
    zIndex: 9001,
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    transitionProperty: 'width, height',
    transitionDuration: '90ms',
  },
  cursorRing: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    border: '2px solid rgba(78, 161, 255, 0.95)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0)',
  },
  cursorDot: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    backgroundColor: '#4ea1ff',
    border: '2px solid #ffffff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  pip: {
    position: 'fixed',
    right: '18px',
    bottom: '18px',
    zIndex: 9002,
    pointerEvents: 'auto',
    width: '220px',
    borderRadius: tokens.borderRadiusLarge,
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
  },
  pipVideo: {
    display: 'block',
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    backgroundColor: '#000',
  },
  pipBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
  },
  pipHint: {
    padding: '0 8px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusPill: {
    position: 'fixed',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9002,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow8,
  },
  clickFlash: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 211, 77, 0.45)',
    animationName: {
      from: { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0.9 },
      to: { transform: 'translate(-50%, -50%) scale(1.6)', opacity: 0 },
    },
    animationDuration: '220ms',
    animationFillMode: 'forwards',
  },
})

export function HandControlProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles()
  const [enabled, setEnabled] = React.useState(false)
  const [status, setStatus] = React.useState<HandStatus>('idle')
  const [pose, setPose] = React.useState<HandPose | null>(null)
  const [down, setDown] = React.useState(false)
  const [flash, setFlash] = React.useState(0)
  const [errorMsg, setErrorMsg] = React.useState('')

  const videoRef = React.useRef<HTMLVideoElement>(null)
  const pipVideoRef = React.useRef<HTMLVideoElement>(null)
  const [stream, setStream] = React.useState<MediaStream | null>(null)
  const rafRef = React.useRef<number>(0)
  const lastFrameRef = React.useRef(0)
  const poseRef = React.useRef<HandPose | null>(null)
  const downTargetRef = React.useRef<Element | null>(null)
  const lastScrollYRef = React.useRef<number | null>(null)
  const smoothRef = React.useRef({ x: 0.5, y: 0.5 })
  const enabledRef = React.useRef(false)
  enabledRef.current = enabled

  /* ---- main loop -------------------------------------------------- */
  React.useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let landmarker: Awaited<ReturnType<typeof loadHandLandmarker>> | null = null

    const cleanup = () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach((t) => t.stop())
      setStream(null)
      if (videoRef.current) videoRef.current.srcObject = null
      if (pipVideoRef.current) pipVideoRef.current.srcObject = null
      landmarker?.close()
      restoreCaptureShim()
      disposeHandLandmarker()
      setStatus('idle')
      setPose(null)
      smoothRef.current = { x: 0.5, y: 0.5 }
    }

    const loop = () => {
      if (cancelled || !enabledRef.current) return
      const video = videoRef.current
      if (landmarker && video && video.readyState >= 2) {
        try {
          const now = performance.now()
          if (now - lastFrameRef.current > 33) {
            lastFrameRef.current = now
            const result = landmarker.detectForVideo(video, now)
            const hand = result.landmarks?.[0]
            const p = analyzeHand(hand)
            poseRef.current = p
            if (p.visible) {
              smoothRef.current.x += (p.x - smoothRef.current.x) * 0.38
              smoothRef.current.y += (p.y - smoothRef.current.y) * 0.38
            }
            setPose({ ...p, x: smoothRef.current.x, y: smoothRef.current.y })
          }
        } catch {
          // transient detection errors are ignored; next frame retries
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    const start = async () => {
      try {
        setStatus('loading')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        setStream(stream)
        setStatus('camera')

        landmarker = await loadHandLandmarker()
        if (cancelled) return
        installCaptureShim()
        setStatus('ready')
        lastFrameRef.current = performance.now()
        rafRef.current = requestAnimationFrame(loop)
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access for this site and try again.'
            : err instanceof Error && err.message
              ? err.message
              : 'Could not start the camera.'
        setErrorMsg(msg)
        setStatus('error')
      }
    }

    start()
    return cleanup
  }, [enabled])

  /* ---- gesture → input synthesis ---------------------------------- */
  React.useEffect(() => {
    if (!enabled) return

    const step = () => {
      const p = poseRef.current
      if (!p || !p.visible) {
        lastScrollYRef.current = null
        return
      }
      const x = p.x * window.innerWidth
      const y = p.y * window.innerHeight

      const hovering = document.elementFromPoint(x, y)
      dispatchPointer('pointermove', x, y, downTargetRef.current ? 1 : 0, hovering)

      // two-finger scroll: vertical hand movement scrolls the hovered container
      if (p.scroll) {
        if (lastScrollYRef.current !== null) {
          const delta = (lastScrollYRef.current - p.y) * window.innerHeight * 0.9
          if (Math.abs(delta) > 0.5) {
            const scroller = findScrollable(hovering)
            scroller?.scrollBy({ top: delta })
          }
        }
        lastScrollYRef.current = p.y
      } else {
        lastScrollYRef.current = null
      }

      // pinch click / drag
      if (p.pinch && !downTargetRef.current) {
        downTargetRef.current = hovering
        dispatchPointer('pointerdown', x, y, 1, hovering)
        setDown(true)
      } else if (!p.pinch && downTargetRef.current) {
        const target = downTargetRef.current
        downTargetRef.current = null
        dispatchPointer('pointerup', x, y, 0, hovering)
        dispatchClick(x, y, target)
        setDown(false)
        setFlash((f) => f + 1)
      } else if (p.pinch && downTargetRef.current) {
        dispatchPointer('pointermove', x, y, 1, hovering)
      }
    }

    const interval = window.setInterval(step, 33)
    return () => window.clearInterval(interval)
  }, [enabled])

  // Feed the camera stream into both the hidden detection video and the PiP preview.
  React.useEffect(() => {
    if (!stream) return
    const videos = [videoRef.current, pipVideoRef.current].filter(Boolean) as HTMLVideoElement[]
    videos.forEach((v) => {
      if (!v.srcObject) {
        v.srcObject = stream
        v.play().catch(() => {})
      }
    })
  }, [stream])

  const toggle = React.useCallback((on: boolean) => {
    setEnabled(on)
  }, [])

  const value = React.useMemo(() => ({ enabled, setEnabled: toggle }), [enabled, toggle])

  return (
    <HandControlContext.Provider value={value}>
      {children}

      {/* hidden video feed the landmarker reads from */}
      {enabled && (
        <video
          ref={videoRef}
          style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          playsInline
          muted
          aria-hidden
        />
      )}

      {enabled && status !== 'error' && (
        <div className={styles.statusPill}>
          {status === 'loading' && <Spinner size="tiny" />}
          <Text size={200}>
            {status === 'loading'
              ? 'Loading hand-tracking model…'
              : status === 'camera'
                ? 'Starting camera…'
                : pose?.visible
                  ? 'Pinch to click · two fingers to scroll'
                  : 'Show your hand to the camera'}
          </Text>
        </div>
      )}

      {enabled && pose?.visible && (
        <div className={styles.overlay} aria-hidden>
          <div
            className={styles.cursor}
            style={{
              left: pose.x * window.innerWidth,
              top: pose.y * window.innerHeight,
            }}
          >
            <span
              className={styles.cursorDot}
              style={{ width: down ? 10 : 16, height: down ? 10 : 16 }}
            />
            <span
              className={styles.cursorRing}
              style={{ width: down ? 22 : 34, height: down ? 22 : 34 }}
            />
            {flash > 0 && <span key={flash} className={styles.clickFlash} />}
          </div>
        </div>
      )}

      {enabled && status !== 'error' && (
        <div className={styles.pip}>
          <video
            style={{ transform: 'scaleX(-1)' }}
            className={styles.pipVideo}
            playsInline
            muted
            autoPlay
            aria-label="Camera feed for hand control"
            ref={pipVideoRef}
          />
          <div className={styles.pipBar}>
            <HandRight24Regular />
            <Text size={200} style={{ flexGrow: 1 }}>
              Hand control
            </Text>
            <Tooltip content="Turn off hand control" relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={<Dismiss20Regular />}
                aria-label="Turn off hand control"
                onClick={() => toggle(false)}
              />
            </Tooltip>
          </div>
          <div className={styles.pipHint}>
            <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
              {pose?.visible ? (pose.pinch ? 'Pinch held — drag' : 'Index finger moves cursor · pinch to click') : 'Move your hand into view'}
            </Text>
          </div>
        </div>
      )}

      {enabled && status === 'error' && (
        <div className={styles.pip}>
          <div className={styles.pipBar}>
            <HandRight24Regular />
            <Text size={200} style={{ flexGrow: 1, color: '#ff7a7a' }}>
              Hand control unavailable
            </Text>
            <Tooltip content="Dismiss" relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={<Dismiss20Regular />}
                aria-label="Dismiss hand control error"
                onClick={() => toggle(false)}
              />
            </Tooltip>
          </div>
          <div className={styles.pipHint}>
            <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
              {errorMsg}
            </Text>
          </div>
        </div>
      )}
    </HandControlContext.Provider>
  )
}
