/**
 * Shared signal that lets the 3D lab's OrbitControls rotate ONLY during the
 * hand-tracking "closed fist" gesture. Without this, synthetic pinch-drag
 * events (used for selecting pins and wiring) also spin the camera, which makes
 * it impossible to connect components by hand.
 *
 * Behavior:
 *  - Mouse users (hand control off): rotation always allowed, as normal.
 *  - Hand control on: rotation allowed only while a fist is held.
 */
let handActive = false
let orbitGesture = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export const handOrbit = {
  /** Toggle whether hand control is currently driving the app. */
  setHandActive(v: boolean) {
    if (handActive !== v) {
      handActive = v
      emit()
    }
  },
  /** Toggle the fist-orbit gesture on/off. */
  setOrbitGesture(v: boolean) {
    if (orbitGesture !== v) {
      orbitGesture = v
      emit()
    }
  },
  /** Camera may rotate for mouse users, or during the fist gesture. */
  rotateAllowed() {
    return !handActive || orbitGesture
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}
