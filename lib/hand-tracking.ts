/**
 * Hand-as-mouse engine built on MediaPipe HandLandmarker.
 *
 * A single hand controls the app:
 *  - the index fingertip is the cursor,
 *  - a thumb+index pinch is a click (held = drag / hold-to-select),
 *  - index + middle up scrolls with vertical hand movement,
 *  - opening / closing the whole hand zooms in / out.
 *
 * All coordinates are 0..1 normalized so the React layer can map them to the
 * viewport, and the raw landmarks are exposed so the UI can draw a live skeleton
 * that makes each finger's movement visible.
 *
 * The model + wasm are bundled under /public/mediapipe so the feature works
 * fully offline once the app is built.
 */
import {
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

const WASM_PATH = '/mediapipe/wasm'
const MODEL_PATH = '/mediapipe/models/hand_landmarker.task'

/**
 * MediaPipe hand skeleton connections (pairs of landmark indices). Used purely
 * for drawing the overlay so the bones between finger joints are visible.
 */
export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // middle
  [5, 9], [9, 10], [10, 11], [11, 12],
  // ring
  [9, 13], [13, 14], [14, 15], [15, 16],
  // pinky
  [13, 17], [17, 18], [18, 19], [19, 20],
  // palm base
  [0, 17],
]

/** Fingertip landmark indices (thumb, index, middle, ring, pinky). */
export const FINGERTIPS = [4, 8, 12, 16, 20] as const

export interface HandPose {
  /** True when a hand was detected in the current frame. */
  visible: boolean
  /** Cursor x in 0..1 (already mirrored for a natural mirror-camera feel). */
  x: number
  /** Cursor y in 0..1. */
  y: number
  /** Thumb + index pinch closed (press / hold-to-select while held). */
  pinch: boolean
  /**
   * Continuous thumb↔index distance normalized by hand size (~0.1 when firmly
   * pinched, ~0.8+ when wide open). Exposed so the input layer can apply
   * hysteresis and keep the pinch state from flickering near the threshold.
   */
  pinchRatio: number
  /** Index + middle up, ring + pinky folded: vertical movement scrolls. */
  scroll: boolean
  /** Hand openness 0 (tight fist) .. 1 (fully open palm). Drives zoom. */
  openness: number
  /** Convenience flag: a closed fist. */
  fist: boolean
  /**
   * Raw (un-mirrored) landmarks for the current frame, so the UI can render a
   * skeleton overlay on top of the (CSS-mirrored) camera preview.
   */
  landmarks: NormalizedLandmark[] | null
}

let landmarkerPromise: Promise<HandLandmarker> | null = null

/** Loads the HandLandmarker once and reuses it. Falls back to CPU if GPU fails. */
export function loadHandLandmarker(): Promise<HandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
      const options = {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: 'GPU' as const,
        },
        runningMode: 'VIDEO' as const,
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      }
      try {
        return await HandLandmarker.createFromOptions(fileset, options)
      } catch {
        // Some GPUs / WebGL contexts refuse the GPU delegate — retry on CPU.
        return await HandLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'CPU' },
        })
      }
    })()
  }
  return landmarkerPromise
}

export function disposeHandLandmarker() {
  landmarkerPromise = null
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Euclidean distance between two normalized landmarks. */
const dist = (a: NormalizedLandmark, b: NormalizedLandmark) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

/** A finger counts as extended when its tip is well beyond its PIP joint (measured from the wrist). */
const isExtended = (landmarks: NormalizedLandmark[], tipIdx: number, pipIdx: number) =>
  dist(landmarks[tipIdx], landmarks[0]) > dist(landmarks[pipIdx], landmarks[0]) * 1.08

const NONE: HandPose = {
  visible: false,
  x: 0.5,
  y: 0.5,
  pinch: false,
  pinchRatio: 1,
  scroll: false,
  openness: 0.5,
  fist: false,
  landmarks: null,
}

/**
 * Turns 21 hand landmarks into a cursor + gesture frame.
 * Landmark indices (MediaPipe hands): 0 wrist, 4 thumb tip, 8 index tip,
 * 12 middle tip, 16 ring tip, 20 pinky tip; 5/9/13/17 are the MCPs.
 */
export function analyzeHand(landmarks: NormalizedLandmark[] | undefined): HandPose {
  if (!landmarks || landmarks.length < 21) return NONE

  // Palm size (wrist → middle-finger MCP) is our scale reference so gestures are
  // distance-invariant (they work the same near or far from the camera).
  const handSize = dist(landmarks[0], landmarks[9])
  if (handSize < 0.01) return NONE

  const pinchRatio = dist(landmarks[4], landmarks[8]) / handSize
  const pinch = pinchRatio < 0.34

  const indexUp = isExtended(landmarks, 8, 6)
  const middleUp = isExtended(landmarks, 12, 10)
  const ringUp = isExtended(landmarks, 16, 14)
  const pinkyUp = isExtended(landmarks, 20, 18)
  const scroll = !pinch && indexUp && middleUp && !ringUp && !pinkyUp

  // Continuous openness: how far the four fingertips reach from the wrist,
  // normalized by hand size. ~1.05 when folded into a fist, ~2.2 when the palm
  // is fully open. Mapped to 0..1 and used to drive zoom.
  const reach =
    (dist(landmarks[8], landmarks[0]) +
      dist(landmarks[12], landmarks[0]) +
      dist(landmarks[16], landmarks[0]) +
      dist(landmarks[20], landmarks[0])) /
    (4 * handSize)
  const openness = clamp((reach - 1.05) / (2.15 - 1.05), 0, 1)
  const fist = openness < 0.32

  return {
    visible: true,
    // Mirror X so the cursor follows the hand like a mirror (natural for a webcam).
    x: 1 - landmarks[8].x,
    y: landmarks[8].y,
    pinch,
    pinchRatio,
    scroll,
    openness,
    fist,
    landmarks,
  }
}
