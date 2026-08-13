/**
 * Hand-as-mouse engine built on MediaPipe HandLandmarker.
 *
 * A single hand controls the app: the index fingertip is the cursor,
 * thumb-index pinch is a click (held = drag), and holding index + middle
 * fingers up together scrolls. All coordinates are 0..1 normalized so the
 * React layer can map them to the viewport.
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

export interface HandPose {
  /** True when a hand was detected in the current frame. */
  visible: boolean
  /** Cursor x in 0..1 (already mirrored for a natural mirror-camera feel). */
  x: number
  /** Cursor y in 0..1. */
  y: number
  /** Thumb + index pinch closed (press / drag while held). */
  pinch: boolean
  /** Index + middle up, ring + pinky folded: vertical movement scrolls. */
  scroll: boolean
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
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
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

/** Euclidean distance between two normalized landmarks. */
const dist = (a: NormalizedLandmark, b: NormalizedLandmark) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

/** A finger counts as extended when its tip is well beyond its PIP joint (measured from the wrist). */
const isExtended = (landmarks: NormalizedLandmark[], tipIdx: number, pipIdx: number) =>
  dist(landmarks[tipIdx], landmarks[0]) > dist(landmarks[pipIdx], landmarks[0]) * 1.08

/**
 * Turns 21 hand landmarks into a cursor + gesture frame.
 * Landmark indices (MediaPipe hands): 0 wrist, 4 thumb tip, 8 index tip,
 * 12 middle tip, 16 ring tip, 20 pinky tip; 5/9/13/17 are the MCPs.
 */
export function analyzeHand(landmarks: NormalizedLandmark[] | undefined): HandPose {
  const none: HandPose = { visible: false, x: 0.5, y: 0.5, pinch: false, scroll: false }
  if (!landmarks || landmarks.length < 21) return none

  const handSize = dist(landmarks[0], landmarks[9])
  if (handSize < 0.01) return none

  const pinch = dist(landmarks[4], landmarks[8]) / handSize < 0.34

  const indexUp = isExtended(landmarks, 8, 6)
  const middleUp = isExtended(landmarks, 12, 10)
  const ringUp = isExtended(landmarks, 16, 14)
  const pinkyUp = isExtended(landmarks, 20, 18)
  const scroll = !pinch && indexUp && middleUp && !ringUp && !pinkyUp

  return {
    visible: true,
    // Mirror X so the cursor follows the hand like a mirror (natural for a webcam).
    x: 1 - landmarks[8].x,
    y: landmarks[8].y,
    pinch,
    scroll,
  }
}
