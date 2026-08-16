/**
 * Screen-space registry of every wiring pin currently on the board.
 *
 * Hand-tracking cursors are far less precise than a mouse, so requiring a pinch
 * to land exactly on a pin's tiny hit sphere makes wiring frustrating. This
 * registry lets the wiring flow snap to the NEAREST pin in screen space:
 *  - `PinProjector` (inside the R3F Canvas) projects each pin's world anchor to
 *    screen pixels every frame and calls `set()`.
 *  - The pending-wire preview and the press/release handlers call `nearest()` to
 *    find the closest pin to the hand (or mouse) cursor within a pixel radius.
 *
 * Everything is plain module state (no React) so it can be read synchronously
 * from pointer handlers without waiting for a render.
 */

export interface PinScreenPos {
  instanceId: string
  pinIndex: number
  /** Screen position in client pixels. */
  x: number
  y: number
  /** World-space anchor, so the preview can snap its 3D endpoint to the pin. */
  world: [number, number, number]
}

let pins: PinScreenPos[] = []

export const pinRegistry = {
  set(next: PinScreenPos[]) {
    pins = next
  },
  clear() {
    pins = []
  },
  all(): readonly PinScreenPos[] {
    return pins
  },
  /**
   * The pin closest to (x, y) in client pixels, within `maxDist` px.
   * Optionally exclude one pin (e.g. the already-armed endpoint).
   */
  nearest(
    x: number,
    y: number,
    maxDist: number,
    exclude?: { instanceId: string; pinIndex: number } | null,
  ): PinScreenPos | null {
    let best: PinScreenPos | null = null
    let bestD = maxDist
    for (const p of pins) {
      if (exclude && p.instanceId === exclude.instanceId && p.pinIndex === exclude.pinIndex) {
        continue
      }
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    return best
  },
}

/** Pixel radius within which a pinch/click snaps to a pin. Tuned for hand jitter. */
export const PIN_SNAP_PX = 60
