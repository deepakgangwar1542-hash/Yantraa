'use client'

import * as React from 'react'
import { makeStyles, tokens, Text, Button, Tooltip, Spinner } from '@fluentui/react-components'
import { Dismiss20Regular, HandRight24Regular } from '@fluentui/react-icons'
import {
  loadHandLandmarker,
  analyzeHand,
  disposeHandLandmarker,
  HAND_CONNECTIONS,
  FINGERTIPS,
  type HandPose,
} from '@/lib/hand-tracking'
import { STATUS, MONO_STACK, PCB } from '@/lib/theme'
import { handOrbit } from '@/lib/hand-orbit'

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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

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
 * Synthesizes a wheel "notch" under the cursor. OrbitControls (the 3D lab) and
 * regular scroll containers both react to wheel events, so opening/closing the
 * hand can zoom the scene or the content the cursor is over.
 */
function dispatchWheel(x: number, y: number, deltaY: number, target: Element | null) {
  const t = target ?? document.elementFromPoint(x, y)
  if (!t) return
  const ev = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    deltaX: 0,
    deltaY,
    deltaMode: 0,
    // ctrlKey mimics a pinch-zoom wheel, which many zoomable surfaces honor.
    ctrlKey: true,
  })
  t.dispatchEvent(ev)
}

/** Prefer the 3D canvas under the cursor for zoom (OrbitControls lives there). */
function zoomTargetAt(x: number, y: number): Element | null {
  const el = document.elementFromPoint(x, y)
  if (!el) return null
  if (el instanceof HTMLCanvasElement) return el
  const canvas = el.closest('canvas') ?? el.querySelector?.('canvas')
  return canvas ?? el
}

/** Draws the live hand skeleton (bones + finger joint points) onto a canvas. */
function drawSkeleton(
  canvas: HTMLCanvasElement | null,
  landmarks: { x: number; y: number }[] | null | undefined,
) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  if (!landmarks || landmarks.length < 21) return

  // Bones
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(224, 17, 44, 0.85)'
  ctx.lineCap = 'round'
  for (const [a, b] of HAND_CONNECTIONS) {
    const p = landmarks[a]
    const q = landmarks[b]
    if (!p || !q) continue
    ctx.beginPath()
    ctx.moveTo(p.x * w, p.y * h)
    ctx.lineTo(q.x * w, q.y * h)
    ctx.stroke()
  }

  // Joints — fingertips are highlighted so finger movement reads clearly.
  const tips = new Set(FINGERTIPS as readonly number[])
  landmarks.forEach((lm, i) => {
    const isTip = tips.has(i)
    ctx.beginPath()
    ctx.arc(lm.x * w, lm.y * h, isTip ? 5.5 : 3.5, 0, Math.PI * 2)
    ctx.fillStyle = isTip ? '#ffd34d' : '#e8eefb'
    ctx.fill()
    if (isTip) {
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.stroke()
    }
  })
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
    border: '2px solid rgba(224, 17, 44, 0.95)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0)',
  },
  cursorDot: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    backgroundColor: '#E0112C',
    border: '2px solid #ffffff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  pip: {
    position: 'fixed',
    left: '18px',
    bottom: '18px',
    zIndex: 9002,
    pointerEvents: 'auto',
    width: '220px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: `1px solid ${PCB.strokeRed}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
    touchAction: 'none',
  },
  pipVideoWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 3',
    backgroundColor: '#000',
  },
  pipVideo: {
    display: 'block',
    width: '100%',
    height: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
    backgroundColor: '#000',
  },
  pipOverlay: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    // Mirror to match the flipped video so the skeleton lines up with the hand.
    transform: 'scaleX(-1)',
    pointerEvents: 'none',
  },
  pipBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    cursor: 'grab',
    ':active': { cursor: 'grabbing' },
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
    gap: '10px',
    padding: '6px 14px',
    borderRadius: '5px',
    backgroundColor: 'rgba(18,20,23,0.94)',
    border: `1px solid ${PCB.strokeRed}`,
    boxShadow: tokens.shadow8,
    fontFamily: MONO_STACK,
  },
  // Small tracking LED: green live, amber searching, red fault.
  trackLed: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  trackLive: {
    backgroundColor: STATUS.active,
    boxShadow: `0 0 8px 1px ${STATUS.active}`,
  },
  trackSearch: {
    backgroundColor: STATUS.warning,
    animationName: 'led-blink',
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'steps(1,end)',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
    },
  },
  trackLabel: {
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: tokens.colorNeutralForeground2,
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
  const pipCanvasRef = React.useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = React.useState<MediaStream | null>(null)
  const rafRef = React.useRef<number>(0)
  const lastFrameRef = React.useRef(0)
  const poseRef = React.useRef<HandPose | null>(null)
  const lastScrollYRef = React.useRef<number | null>(null)
  const smoothRef = React.useRef({ x: 0.5, y: 0.5 })
  const lastOpennessRef = React.useRef<number | null>(null)
  const zoomAccumRef = React.useRef(0)
  // Debounced/hysteresis pinch state so it never flickers near the threshold.
  const pinchOnRef = React.useRef(false)
  const pinchPendingRef = React.useRef(0)
  const enabledRef = React.useRef(false)
  enabledRef.current = enabled

  /* ---- gesture state machine refs --------------------------------- */
  // Initialized to 0 (SSR-safe); the gesture loop overwrites these before use.
  const lastXRef = React.useRef(0)
  const lastYRef = React.useRef(0)
  const prevPinchRef = React.useRef(false)
  // Tight-fist → orbit the 3D view (hysteresis so it doesn't flicker).
  const fistOnRef = React.useRef(false)
  const orbitActiveRef = React.useRef(false)
  const orbitPtrRef = React.useRef({ x: 0, y: 0 })
  const orbitOriginRef = React.useRef({ nx: 0.5, ny: 0.5 })
  const orbitCanvasRef = React.useRef<Element | null>(null)
  // A normal pinch press (click / pin-connect / start of a drag).
  const pressActiveRef = React.useRef(false)
  const pressStartPosRef = React.useRef({ x: 0, y: 0 })
  const pressMovedRef = React.useRef(false)
  const pressTargetRef = React.useRef<Element | null>(null)


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
      lastOpennessRef.current = null
      zoomAccumRef.current = 0
      pinchOnRef.current = false
      pinchPendingRef.current = 0
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

            // Stable pinch: two thresholds (engage < 0.30, release > 0.46) plus a
            // 2-frame debounce. This stops the thumb/index pinch from rapidly
            // toggling when the fingers hover near the trigger distance, which is
            // what made selecting feel irregular and twitchy.
            if (p.visible) {
              const PINCH_ON = 0.3
              const PINCH_OFF = 0.46
              const want = pinchOnRef.current ? p.pinchRatio < PINCH_OFF : p.pinchRatio < PINCH_ON
              if (want !== pinchOnRef.current) {
                pinchPendingRef.current += 1
                if (pinchPendingRef.current >= 2) {
                  pinchOnRef.current = want
                  pinchPendingRef.current = 0
                }
              } else {
                pinchPendingRef.current = 0
              }
              p.pinch = pinchOnRef.current
            } else {
              pinchOnRef.current = false
              pinchPendingRef.current = 0
            }

            poseRef.current = p
            if (p.visible) {
              // Adaptive smoothing (1€-filter style): when the hand is nearly
              // still we smooth hard to kill jitter, and when it moves fast we
              // ease off so the cursor stays responsive. A small deadzone stops
              // the pointer from drifting when you try to hold it in place.
              const dx = p.x - smoothRef.current.x
              const dy = p.y - smoothRef.current.y
              const speed = Math.hypot(dx, dy)
              // While a pinch is held (selecting / connecting a wire) the fingers
              // curl and naturally wobble the cursor, so damp movement harder and
              // widen the deadzone. This keeps the cursor pinned on the target pin
              // so pinch-to-connect lands reliably instead of slipping off.
              const pinching = pinchOnRef.current
              const DEADZONE = pinching ? 0.009 : 0.0035
              if (speed > DEADZONE) {
                const alpha = pinching ? clamp(speed * 6, 0.1, 0.32) : clamp(speed * 11, 0.16, 0.6)
                smoothRef.current.x += dx * alpha
                smoothRef.current.y += dy * alpha
              }
            }
            drawSkeleton(pipCanvasRef.current, p.visible ? p.landmarks : null)
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

    // Tell the 3D lab that hand control is driving it, so the camera only
    // rotates during the fist gesture (never during wiring pinch-drags).
    handOrbit.setHandActive(true)
    handOrbit.setOrbitGesture(false)

    // Gesture tuning constants.
    const FIST_ON = 0.1 // orbit engages ONLY on a fully closed fist
    const FIST_OFF = 0.2 // the moment the hand starts opening, orbit releases
    const ZOOM_STEP = 0.07 // openness delta per zoom "notch"
    const TAP_MOVE = 0.03 // hand travel (normalized) below which a pinch counts as a tap

    /** The <canvas> under a screen point, if any (the 3D lab surface). */
    const canvasAt = (px: number, py: number): Element | null => {
      const el = document.elementFromPoint(px, py)
      if (!el) return null
      if (el instanceof HTMLCanvasElement) return el
      return el.closest?.('canvas') ?? null
    }

    const endOrbit = () => {
      handOrbit.setOrbitGesture(false)
      if (!orbitActiveRef.current) return
      const a = orbitPtrRef.current
      dispatchPointer('pointerup', a.x, a.y, 0, orbitCanvasRef.current)
      orbitActiveRef.current = false
      setDown(false)
    }

    const step = () => {
      const p = poseRef.current

      // Hand lost: gracefully end any in-progress gesture so nothing sticks.
      if (!p || !p.visible) {
        endOrbit()
        const x = lastXRef.current
        const y = lastYRef.current
        if (pressActiveRef.current) {
          dispatchPointer('pointerup', x, y, 0, document.elementFromPoint(x, y))
          pressActiveRef.current = false
          setDown(false)
        }
        lastScrollYRef.current = null
        lastOpennessRef.current = null
        prevPinchRef.current = false
        fistOnRef.current = false
        return
      }

      const x = p.x * window.innerWidth
      const y = p.y * window.innerHeight
      lastXRef.current = x
      lastYRef.current = y
      const hovering = document.elementFromPoint(x, y)

      // Fist detection with hysteresis.
      const fistOn = fistOnRef.current ? p.openness < FIST_OFF : p.openness < FIST_ON
      fistOnRef.current = fistOn

      // Pinch rising / falling edges (pose.pinch is already hysteresis-debounced).
      const pinchRise = p.pinch && !prevPinchRef.current
      const pinchFall = !p.pinch && prevPinchRef.current
      prevPinchRef.current = p.pinch

      /* ---------- ORBIT: tight fist rotates the 3D view --------------- */
      // Exclusive gesture; only a fully closed fist rotates the camera. Any
      // other pose leaves the view perfectly stable so wiring is precise.
      if (fistOn && !pressActiveRef.current && !p.pinch) {
        const canvas = canvasAt(x, y) ?? document.querySelector('canvas')
        if (!orbitActiveRef.current) {
          // Unlock camera rotation for this gesture only.
          handOrbit.setOrbitGesture(true)
          // Anchor the drag at a safe, empty-ish spot on the board so the first
          // pointerdown drives OrbitControls instead of grabbing a component.
          const r = (canvas as Element | null)?.getBoundingClientRect()
          const ax = r ? r.left + r.width * 0.14 : x
          const ay = r ? r.top + r.height * 0.16 : y
          orbitPtrRef.current = { x: ax, y: ay }
          orbitOriginRef.current = { nx: p.x, ny: p.y }
          orbitCanvasRef.current = canvas
          dispatchPointer('pointerdown', ax, ay, 1, canvas)
          orbitActiveRef.current = true
          setDown(true)
        } else {
          // Translate hand travel into pointer travel around the anchor so the
          // view rotates as the fist moves.
          const a = orbitPtrRef.current
          const o = orbitOriginRef.current
          const px = a.x + (p.x - o.nx) * window.innerWidth
          const py = a.y + (p.y - o.ny) * window.innerHeight
          dispatchPointer('pointermove', px, py, 1, orbitCanvasRef.current)
        }
        lastScrollYRef.current = null
        lastOpennessRef.current = null
        zoomAccumRef.current = 0
        return
      }
      endOrbit()

      // Baseline hover / drag move. While a pinch is held the button stays down
      // so a component drag or a wire drag follows the hand continuously.
      const buttons = pressActiveRef.current ? 1 : 0
      dispatchPointer('pointermove', x, y, buttons, hovering)

      /* ---------- TWO FINGERS up / down: zoom the lab OR scroll panels -
       * A single vocabulary for vertical hand travel with two fingers up
       * (index + middle). Over the 3D lab it drives the zoom wheel; over any
       * scrollable panel it scrolls. Open / close no longer zooms, so it can
       * never be confused with the fist-orbit gesture.
       */
      if (p.scroll && !pressActiveRef.current) {
        const overCanvas = !!canvasAt(x, y)
        if (lastScrollYRef.current !== null) {
          const dy = lastScrollYRef.current - p.y // hand up (dy>0) → zoom in / scroll up
          if (overCanvas) {
            // Accumulate travel into discrete zoom notches for a smooth zoom.
            zoomAccumRef.current += dy
            let ticks = 0
            while (zoomAccumRef.current > ZOOM_STEP && ticks < 4) {
              zoomAccumRef.current -= ZOOM_STEP
              ticks += 1
              dispatchWheel(x, y, -100, zoomTargetAt(x, y)) // hand up → zoom in
            }
            while (zoomAccumRef.current < -ZOOM_STEP && ticks < 4) {
              zoomAccumRef.current += ZOOM_STEP
              ticks += 1
              dispatchWheel(x, y, 100, zoomTargetAt(x, y)) // hand down → zoom out
            }
          } else {
            const delta = dy * window.innerHeight * 0.9
            if (Math.abs(delta) > 0.5) findScrollable(hovering)?.scrollBy({ top: delta })
          }
        }
        lastScrollYRef.current = p.y
      } else {
        lastScrollYRef.current = null
        zoomAccumRef.current = 0
      }

      /* ---------- PINCH: press → drag → release ----------------------
       * A pinch is a real pointer press. Hold and move to drag a component
       * (move mode) or pull a wire from one pin to another (wire mode); the
       * matching pin's pointerup verifies and lays the jumper. A pinch that
       * doesn't move is a plain click (select / press a button).
       */
      if (pinchRise && !pressActiveRef.current) {
        pressActiveRef.current = true
        pressMovedRef.current = false
        pressStartPosRef.current = { x, y }
        pressTargetRef.current = hovering
        dispatchPointer('pointerdown', x, y, 1, hovering)
        setDown(true)
      } else if (pinchFall && pressActiveRef.current) {
        pressActiveRef.current = false
        dispatchPointer('pointerup', x, y, 0, hovering)
        // Only synthesize a click when the hand stayed put — a drag already
        // delivered its own down/move/up to the pin or component.
        if (!pressMovedRef.current) dispatchClick(x, y, pressTargetRef.current)
        setDown(false)
        setFlash((f) => f + 1)
      } else if (p.pinch && pressActiveRef.current) {
        // Holding: once the hand travels past the tap threshold it's a drag.
        const sp = pressStartPosRef.current
        if (
          Math.hypot(p.x - sp.x / window.innerWidth, p.y - sp.y / window.innerHeight) > TAP_MOVE
        ) {
          pressMovedRef.current = true
        }
      }
    }

    const interval = window.setInterval(step, 33)
    return () => {
      window.clearInterval(interval)
      // Hand control is off — restore normal (mouse) camera behavior.
      handOrbit.setOrbitGesture(false)
      handOrbit.setHandActive(false)
    }
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

  /* ---- draggable camera feed (starts bottom-left) ----------------- */
  const pipRef = React.useRef<HTMLDivElement>(null)
  const [pipPos, setPipPos] = React.useState<{ left: number; top: number } | null>(null)

  const startPipDrag = React.useCallback((e: React.PointerEvent) => {
    // Don't start a drag when the pointer is on the dismiss button.
    if ((e.target as Element).closest('button')) return
    const el = pipRef.current
    if (!el) return
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    const offX = e.clientX - rect.left
    const offY = e.clientY - rect.top
    const move = (ev: PointerEvent) => {
      const left = clamp(ev.clientX - offX, 4, window.innerWidth - rect.width - 4)
      const top = clamp(ev.clientY - offY, 4, window.innerHeight - rect.height - 4)
      setPipPos({ left, top })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [])

  // When positioned by dragging, override the default bottom-left anchor.
  const pipStyle = pipPos
    ? { left: pipPos.left, top: pipPos.top, right: 'auto' as const, bottom: 'auto' as const }
    : undefined

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
          {status === 'loading' || status === 'camera' ? (
            <Spinner size="tiny" />
          ) : (
            <span
              className={`${styles.trackLed} ${
                pose?.visible ? styles.trackLive : styles.trackSearch
              }`}
              aria-hidden
            />
          )}
          <span className={styles.trackLabel}>
            {status === 'loading'
              ? 'INIT MODEL'
              : status === 'camera'
                ? 'CAMERA'
                : pose?.visible
                  ? 'TRACKING'
                  : 'SEARCHING'}
          </span>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {status === 'ready'
              ? pose?.visible
                ? 'Fist to orbit · two fingers to zoom · pinch to select & wire'
                : 'Show your hand to the camera'
              : status === 'loading'
                ? 'Loading hand-tracking model…'
                : 'Starting camera…'}
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
        <div ref={pipRef} className={styles.pip} style={pipStyle}>
          <div className={styles.pipVideoWrap}>
            <video
              style={{ transform: 'scaleX(-1)' }}
              className={styles.pipVideo}
              playsInline
              muted
              autoPlay
              aria-label="Camera feed for hand control"
              ref={pipVideoRef}
            />
            <canvas
              ref={pipCanvasRef}
              width={320}
              height={240}
              className={styles.pipOverlay}
              aria-hidden
            />
          </div>
          <div className={styles.pipBar} onPointerDown={startPipDrag} title="Drag to move the camera feed">
            <span
              className={`${styles.trackLed} ${pose?.visible ? styles.trackLive : styles.trackSearch}`}
              aria-hidden
            />
            <Text
              size={200}
              style={{
                flexGrow: 1,
                fontFamily: MONO_STACK,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Hand tracking
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
              {pose?.visible
                ? pose.fist
                  ? 'Fist — move to orbit the view'
                  : pose.pinch
                    ? 'Pinch held — drag to move parts or pull a wire'
                    : pose.scroll
                      ? 'Two fingers — move up / down to zoom'
                      : 'Fist orbits · two fingers zoom · pinch a pin & drag to wire'
                : 'Move your hand into view'}
            </Text>
          </div>
        </div>
      )}

      {enabled && status === 'error' && (
        <div className={styles.pip}>
          <div className={styles.pipBar}>
            <HandRight24Regular />
            <Text
              size={200}
              style={{
                flexGrow: 1,
                color: STATUS.error,
                fontFamily: MONO_STACK,
                letterSpacing: '0.08em',
              }}
            >
              FAULT · UNAVAILABLE
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
