'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import {
  makeStyles,
  tokens,
  Button,
  ToggleButton,
  Text,
  Subtitle2,
  Caption1,
  Body1,
  Badge,
  Tooltip,
} from '@fluentui/react-components'
import {
  ArrowMove20Regular,
  Link20Regular,
  Delete20Regular,
  Add20Regular,
  ArrowClockwise20Regular,
  Cursor20Regular,
  Info20Regular,
  HandRight20Regular,
  Play20Regular,
  Stop20Regular,
  DismissCircle20Regular,
  Warning20Regular,
  CheckmarkCircle20Regular,
} from '@fluentui/react-icons'
import { COMPONENTS, getComponent } from '@/lib/electronics-data'
import {
  analyzeCircuit,
  type CircuitReport,
  type PlacedInstance,
  type Wire,
  type WireEnd,
} from '@/lib/circuit-engine'
import { useHandControl } from '@/components/hand-control'
import {
  labBus,
  labSnapshot,
  resolveInstanceId,
  resolvePinIndex,
  type LabAction,
} from '@/lib/lab-actions'
import { useGuided } from '@/lib/guided-context'
import { evaluateProgress } from '@/lib/projects'
import { PCB, MONO_STACK, GLOW, STATUS } from '@/lib/theme'

const LabScene = dynamic(
  () => import('@/components/lab/lab-scene').then((m) => m.LabScene),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          color: '#7a8aa5',
          backgroundColor: '#0b0d0f',
          fontFamily: MONO_STACK,
          letterSpacing: '0.08em',
        }}
      >
        Loading 3D lab&hellip;
      </div>
    ),
  },
)

const useStyles = makeStyles({
  root: {
    position: 'relative',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: PCB.base,
  },
  canvasWrap: {
    position: 'absolute',
    inset: '0',
  },
  panel: {
    position: 'absolute',
    top: tokens.spacingVerticalM,
    left: tokens.spacingHorizontalM,
    width: '234px',
    maxHeight: 'calc(100% - 32px)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '6px',
    border: `1px solid ${PCB.strokeRed}`,
    backgroundColor: 'rgba(18, 20, 23, 0.9)',
    backdropFilter: 'blur(12px)',
    overflow: 'hidden',
  },
  panelHead: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalS,
    color: '#e8eefb',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  palette: {
    overflowY: 'auto',
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  paletteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    border: 'none',
    background: 'transparent',
    color: '#e8eefb',
    cursor: 'pointer',
    textAlign: 'left',
    ':hover': {
      backgroundColor: 'rgba(255, 45, 45, 0.12)',
    },
  },
  swatch: {
    display: 'grid',
    placeItems: 'center',
    width: '30px',
    height: '30px',
    borderRadius: tokens.borderRadiusMedium,
    color: '#fff',
    fontSize: '10px',
    fontWeight: tokens.fontWeightBold,
    flexShrink: 0,
  },
  itemText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flexGrow: 1,
  },
  itemName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  toolbar: {
    position: 'absolute',
    top: tokens.spacingVerticalM,
    right: tokens.spacingHorizontalM,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: tokens.spacingHorizontalXS,
    borderRadius: '6px',
    border: `1px solid ${PCB.strokeRed}`,
    backgroundColor: 'rgba(18, 20, 23, 0.9)',
    backdropFilter: 'blur(12px)',
  },
  spacer: {
    width: '1px',
    height: '24px',
    backgroundColor: tokens.colorNeutralStroke2,
    marginLeft: tokens.spacingHorizontalXXS,
    marginRight: tokens.spacingHorizontalXXS,
  },
  guidedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    height: '28px',
    borderRadius: '4px',
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: STATUS.active,
    border: `1px solid ${PCB.strokeRed}`,
  },
  selectedCard: {
    position: 'absolute',
    bottom: tokens.spacingVerticalM,
    left: tokens.spacingHorizontalM,
    width: '234px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalM,
    borderRadius: '6px',
    border: `1px solid ${PCB.strokeRed}`,
    backgroundColor: 'rgba(18, 20, 23, 0.94)',
    backdropFilter: 'blur(12px)',
    color: '#e8eefb',
  },
  selectedTop: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  selectedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  hint: {
    position: 'absolute',
    bottom: tokens.spacingVerticalM,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderRadius: '5px',
    backgroundColor: 'rgba(18, 20, 23, 0.9)',
    backdropFilter: 'blur(12px)',
    border: `1px solid ${PCB.strokeRed}`,
    color: '#c7d3ea',
    maxWidth: '80%',
  },
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#8496b5',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXS,
  },
  // Circuit check panel
  checkPanel: {
    position: 'absolute',
    bottom: tokens.spacingVerticalM,
    right: tokens.spacingHorizontalM,
    width: '300px',
    maxHeight: 'calc(100% - 140px)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '6px',
    border: `1px solid ${PCB.strokeRed}`,
    backgroundColor: 'rgba(18, 20, 23, 0.92)',
    backdropFilter: 'blur(12px)',
    overflow: 'hidden',
    color: '#e8eefb',
  },
  checkHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  checkList: {
    overflowY: 'auto',
    padding: tokens.spacingHorizontalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  checkItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalXS,
  },
  checkIcon: {
    marginTop: '2px',
    flexShrink: 0,
  },
})

let counter = 0
function nextId() {
  counter += 1
  return `inst-${Date.now().toString(36)}-${counter}`
}

const ISSUE_ICON: Record<
  CircuitReport['issues'][number]['severity'],
  { icon: React.ReactElement; color: string }
> = {
  error: { icon: <DismissCircle20Regular />, color: '#ff7a7a' },
  warning: { icon: <Warning20Regular />, color: '#ffd166' },
  info: { icon: <Info20Regular />, color: '#8ecbff' },
  success: { icon: <CheckmarkCircle20Regular />, color: '#5fd38a' },
}

export function SpatialLab() {
  const styles = useStyles()
  const { enabled: handsEnabled, setEnabled: setHandsEnabled } = useHandControl()
  const [placed, setPlaced] = React.useState<PlacedInstance[]>([])
  const [wires, setWires] = React.useState<Wire[]>([])
  const [mode, setMode] = React.useState<'move' | 'wire'>('move')
  const [running, setRunning] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [pendingWire, setPendingWire] = React.useState<WireEnd | null>(null)
  const [pressedIds, setPressedIds] = React.useState<ReadonlySet<string>>(new Set())

  // Synchronous mirror of pendingWire + which pin a press started on, so the
  // press/release wiring flow (mouse click-click OR hand pinch-drag) works
  // without waiting for React state to settle.
  const pendingRef = React.useRef<WireEnd | null>(null)
  pendingRef.current = pendingWire
  const pinPressRef = React.useRef<{ instanceId: string; pinIndex: number; started: boolean } | null>(null)

  // ---- Guided "Build Path" mode -----------------------------------------
  // The Build Path reuses this single lab instance so we never open a second
  // WebGL context. When a project is active we pre-place its parts, force
  // wire mode + always-live simulation, hide the palette, and stream build
  // progress up to the workspace. Closing restores the free-build workbench.
  const { activeProject, reportProgress } = useGuided()
  const guided = activeProject != null
  const activeProjectId = activeProject?.id ?? null
  // Ref mirror so stable callbacks (deleteInstance) can read the latest value.
  const guidedRef = React.useRef(guided)
  guidedRef.current = guided

  // Live mirrors of the editable state so we can snapshot the free-build
  // workbench the instant a guided project opens, then restore it on close.
  const stateRef = React.useRef({ placed, wires, mode, running, pressedIds })
  stateRef.current = { placed, wires, mode, running, pressedIds }
  const freeBuildSnapshot = React.useRef<typeof stateRef.current | null>(null)
  const prevProjectId = React.useRef<string | null>(null)

  React.useEffect(() => {
    const prev = prevProjectId.current
    prevProjectId.current = activeProjectId

    if (activeProjectId && prev !== activeProjectId) {
      // Entering (or switching) a guided project. Snapshot the free-build
      // board once, on the first transition out of free mode.
      if (!prev) freeBuildSnapshot.current = stateRef.current
      setPlaced(activeProject!.targetPlaced.map((p) => ({ ...p })))
      setWires([])
      setSelectedId(null)
      setPendingWire(null)
      setPressedIds(new Set())
      setMode('wire')
      setRunning(true)
    } else if (!activeProjectId && prev) {
      // Leaving guided mode — restore the workbench exactly as it was.
      const snap = freeBuildSnapshot.current
      freeBuildSnapshot.current = null
      setPlaced(snap ? snap.placed : [])
      setWires(snap ? snap.wires : [])
      setMode(snap ? snap.mode : 'move')
      setRunning(snap ? snap.running : false)
      setPressedIds(snap ? snap.pressedIds : new Set())
      setSelectedId(null)
      setPendingWire(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId])

  const report = React.useMemo(
    () => analyzeCircuit(placed, wires, pressedIds),
    [placed, wires, pressedIds],
  )

  // Stream guided progress to the workspace whenever the build changes.
  React.useEffect(() => {
    if (!activeProject) return
    reportProgress(evaluateProgress(activeProject, wires, report))
  }, [activeProject, wires, report, reportProgress])

  const addComponent = React.useCallback((componentId: string, instanceId?: string) => {
    setPlaced((prev) => {
      const index = prev.length
      const x = -3 + (index % 4) * 2
      const z = -2.4 + Math.floor(index / 4) * 2
      const snap = (v: number) => Math.round(v / 0.25) * 0.25
      const pos: [number, number, number] = [
        Math.max(-5.5, Math.min(5.5, snap(x))),
        0,
        Math.max(-3.5, Math.min(3.5, snap(z))),
      ]
      return [...prev, { instanceId: instanceId ?? nextId(), componentId, position: pos }]
    })
  }, [])

  const handleMove = React.useCallback(
    (id: string, pos: [number, number, number]) => {
      setPlaced((prev) =>
        prev.map((p) => (p.instanceId === id ? { ...p, position: pos } : p)),
      )
    },
    [],
  )

  const handleSelect = React.useCallback(
    (id: string) => {
      setSelectedId(id)
      if (mode !== 'wire') setPendingWire(null)
    },
    [mode],
  )

  const connectWire = React.useCallback((from: WireEnd, to: WireEnd) => {
    setWires((prev) => {
      const exists = prev.some(
        (w) =>
          (w.from.instanceId === from.instanceId &&
            w.from.pinIndex === from.pinIndex &&
            w.to.instanceId === to.instanceId &&
            w.to.pinIndex === to.pinIndex) ||
          (w.from.instanceId === to.instanceId &&
            w.from.pinIndex === to.pinIndex &&
            w.to.instanceId === from.instanceId &&
            w.to.pinIndex === from.pinIndex),
      )
      if (exists) return prev
      return [...prev, { id: `wire-${nextId()}`, from, to }]
    })
  }, [])

  // Press on a pin: select the component and, in wire mode, arm the pending
  // endpoint if none is armed yet. Works for a mouse press or a hand pinch.
  const handlePinDown = React.useCallback(
    (instanceId: string, pinIndex: number) => {
      setSelectedId(instanceId)
      if (mode !== 'wire') return
      const started = !pendingRef.current
      if (started) {
        pendingRef.current = { instanceId, pinIndex }
        setPendingWire(pendingRef.current)
      }
      pinPressRef.current = { instanceId, pinIndex, started }
    },
    [mode],
  )

  // Release on a pin: if a different pin is armed, connect the two (this is the
  // drag-to-connect completion). Releasing on the armed pin keeps it armed the
  // first time, and cancels it on a second, deliberate tap.
  const handlePinUp = React.useCallback(
    (instanceId: string, pinIndex: number) => {
      if (mode !== 'wire') return
      const pending = pendingRef.current
      const press = pinPressRef.current
      pinPressRef.current = null
      if (!pending) return
      const samePin = pending.instanceId === instanceId && pending.pinIndex === pinIndex
      if (samePin) {
        // Keep the arm alive on the initial press; cancel on a later re-tap.
        if (press && press.started && press.instanceId === instanceId && press.pinIndex === pinIndex) {
          return
        }
        pendingRef.current = null
        setPendingWire(null)
        return
      }
      // Different pin → verify and lay the jumper between these exact nodes.
      connectWire(pending, { instanceId, pinIndex })
      pendingRef.current = null
      setPendingWire(null)
    },
    [mode, connectWire],
  )

  const deleteWire = React.useCallback((id: string) => {
    setWires((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const togglePress = React.useCallback((instanceId: string) => {
    setPressedIds((prev) => {
      const next = new Set(prev)
      if (next.has(instanceId)) next.delete(instanceId)
      else next.add(instanceId)
      return next
    })
    setSelectedId(instanceId)
  }, [])

  const deleteInstance = React.useCallback((id: string) => {
    // In guided mode the parts list is fixed — students only wire them up.
    if (guidedRef.current) return
    setPlaced((prev) => prev.filter((p) => p.instanceId !== id))
    setWires((prev) => prev.filter((w) => w.from.instanceId !== id && w.to.instanceId !== id))
    setPressedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setSelectedId((cur) => (cur === id ? null : cur))
    setPendingWire(null)
  }, [])

  const deleteSelected = React.useCallback(() => {
    if (!selectedId) return
    deleteInstance(selectedId)
  }, [selectedId, deleteInstance])

  const clearAll = React.useCallback(() => {
    setPlaced([])
    setWires([])
    setSelectedId(null)
    setPendingWire(null)
    setPressedIds(new Set())
    setRunning(false)
  }, [])

  const switchMode = React.useCallback((m: 'move' | 'wire') => {
    setMode(m)
    setPendingWire(null)
  }, [])

  // Keep a synchronous mirror of the board so voice actions in one batch
  // (e.g. "add a resistor and connect it") can resolve parts added moments ago,
  // and so the voice layer can describe the board to the LLM.
  const placedForVoiceRef = React.useRef<PlacedInstance[]>([])
  React.useEffect(() => {
    placedForVoiceRef.current = placed
    labSnapshot.set(placed)
  }, [placed])

  // Execute an ordered batch of voice actions against the real lab callbacks.
  const runVoiceActions = React.useCallback(
    (actions: LabAction[]) => {
      // Work against a local copy of the board that grows as we add parts, so a
      // later connect in the same utterance can see an earlier add.
      let board = [...placedForVoiceRef.current]
      for (const action of actions) {
        switch (action.type) {
          case 'add': {
            const id = nextId()
            addComponent(action.componentId, id)
            board = [...board, { instanceId: id, componentId: action.componentId, position: [0, 0, 0] }]
            setSelectedId(id)
            break
          }
          case 'mode':
            switchMode(action.mode)
            break
          case 'connect': {
            const fromId = resolveInstanceId(board, action.from.component)
            const toId = resolveInstanceId(board, action.to.component)
            if (!fromId || !toId) break
            switchMode('wire')
            connectWire(
              { instanceId: fromId, pinIndex: resolvePinIndex(action.from.component.componentId, action.from.pinHint) },
              { instanceId: toId, pinIndex: resolvePinIndex(action.to.component.componentId, action.to.pinHint) },
            )
            break
          }
          case 'run':
            setRunning(action.on)
            break
          case 'delete': {
            const id = action.component
              ? resolveInstanceId(board, action.component)
              : selectedId
            if (id) {
              deleteInstance(id)
              board = board.filter((p) => p.instanceId !== id)
            }
            break
          }
          case 'clear':
            clearAll()
            board = []
            break
          case 'press': {
            const id = resolveInstanceId(board, action.component)
            if (id) togglePress(id)
            break
          }
          case 'zoom':
            // Zoom is handled visually by the voice component via the wheel; no
            // board state to change here.
            break
        }
      }
    },
    [addComponent, switchMode, connectWire, deleteInstance, clearAll, togglePress, selectedId],
  )

  React.useEffect(() => labBus.subscribe(runVoiceActions), [runVoiceActions])

  // Escape cancels a pending wire and deselects.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingWire(null)
        setSelectedId((s) => (s ? null : s))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selectedInst = React.useMemo(
    () => placed.find((p) => p.instanceId === selectedId),
    [placed, selectedId],
  )
  const selectedDef = React.useMemo(
    () => (selectedInst ? getComponent(selectedInst.componentId) : undefined),
    [selectedInst],
  )
  const selectedState = selectedId ? report.states[selectedId] : undefined

  const errorCount = report.issues.filter((i) => i.severity === 'error').length
  const warningCount = report.issues.filter((i) => i.severity === 'warning').length
  const checkBadge = errorCount > 0
    ? { text: `${errorCount} error${errorCount > 1 ? 's' : ''}`, color: 'danger' as const }
    : warningCount > 0
      ? { text: `${warningCount} warning${warningCount > 1 ? 's' : ''}`, color: 'warning' as const }
      : report.hasClosedLoop
        ? { text: 'Circuit OK', color: 'success' as const }
        : { text: 'No power', color: 'informative' as const }

  const hintText = guided
    ? pendingWire
      ? 'Now click the matching gold pin to complete this jumper. Follow the current step on the right.'
      : 'Click a gold pin, then its pair, to lay a jumper wire. Watch the traces light up as current flows.'
    : running
    ? 'Simulation running: check the Circuit panel for wiring issues. Press Stop to edit again.'
    : mode === 'wire'
      ? pendingWire
        ? 'Wire mode: now click a gold pin on the second component to finish the jumper.'
        : 'Wire mode: click a gold pin to start a jumper, then another pin to finish. Click a wire to remove it.'
      : 'Move mode: drag parts (they snap to the grid). Click a button to press it. Drag empty space to orbit.'

  return (
    <div className={styles.root}>
      <div className={styles.canvasWrap}>
        <LabScene
          placed={placed}
          wires={wires}
          mode={mode}
          running={running}
          selectedId={selectedId}
          pendingWire={pendingWire}
          report={report}
          pressedIds={pressedIds}
          onSelect={handleSelect}
          onPinDown={handlePinDown}
          onPinUp={handlePinUp}
          onMove={handleMove}
          onRemove={deleteInstance}
          onDragStateChange={() => {}}
          onDeselect={() => {
            setSelectedId(null)
            setPendingWire(null)
          }}
          onDeleteWire={deleteWire}
          onTogglePress={togglePress}
        />
      </div>

      {!guided && placed.length === 0 && (
        <div className={styles.emptyState}>
          <Add20Regular fontSize={28} />
          <Subtitle2 style={{ color: '#c7d3ea' }}>Your workbench is empty</Subtitle2>
          <Caption1>Click a component on the left to drop it into the 3D lab.</Caption1>
        </div>
      )}

      {/* Palette — free-build only; guided projects come pre-stocked. */}
      {!guided && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <Add20Regular />
            <Subtitle2 style={{ color: 'inherit' }}>Components</Subtitle2>
          </div>
          <div className={styles.palette}>
            {COMPONENTS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={styles.paletteItem}
                onClick={() => addComponent(c.id)}
              >
                <span className={styles.swatch} style={{ backgroundColor: c.color }}>
                  {c.symbol}
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{c.name}</span>
                  <Caption1 style={{ color: '#8496b5' }}>{c.category}</Caption1>
                </span>
                <Add20Regular style={{ color: tokens.colorBrandForeground1, flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {guided ? (
          <>
            <span className={styles.guidedTag}>WIRE MODE · LIVE</span>
            <Tooltip content="Remove all your jumper wires and start the wiring over" relationship="label">
              <Button
                appearance="subtle"
                icon={<ArrowClockwise20Regular />}
                onClick={() => {
                  setWires([])
                  setPendingWire(null)
                  setSelectedId(null)
                }}
                disabled={wires.length === 0}
              >
                Reset wires
              </Button>
            </Tooltip>
            <span className={styles.spacer} />
          </>
        ) : (
          <>
            <Tooltip content="Move & arrange components" relationship="label">
              <ToggleButton
                appearance="subtle"
                checked={mode === 'move'}
                icon={<ArrowMove20Regular />}
                onClick={() => switchMode('move')}
              >
                Move
              </ToggleButton>
            </Tooltip>
            <Tooltip content="Connect pins with jumper wires" relationship="label">
              <ToggleButton
                appearance="subtle"
                checked={mode === 'wire'}
                icon={<Link20Regular />}
                onClick={() => switchMode('wire')}
              >
                Wire
              </ToggleButton>
            </Tooltip>
            <span className={styles.spacer} />
            <Tooltip
              content={running ? 'Stop the simulation' : 'Run the circuit (LEDs & buzzers activate)'}
              relationship="label"
            >
              <ToggleButton
                appearance={running ? 'primary' : 'subtle'}
                checked={running}
                icon={running ? <Stop20Regular /> : <Play20Regular />}
                onClick={() => setRunning((r) => !r)}
                disabled={placed.length === 0}
                style={running ? { boxShadow: GLOW.md } : undefined}
              >
                {running ? 'Live' : 'Run'}
              </ToggleButton>
            </Tooltip>
            <span className={styles.spacer} />
          </>
        )}
        <Tooltip
          content={handsEnabled ? 'Turn off hand control' : 'Control the app with your hand (camera)'}
          relationship="label"
        >
          <Button
            appearance={handsEnabled ? 'primary' : 'subtle'}
            icon={<HandRight20Regular />}
            onClick={() => setHandsEnabled(!handsEnabled)}
          >
            Hands
          </Button>
        </Tooltip>
        {!guided && (
          <Tooltip content="Clear the whole board" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowClockwise20Regular />}
              onClick={clearAll}
              disabled={placed.length === 0}
              aria-label="Clear board"
            />
          </Tooltip>
        )}
      </div>

      {/* Selected info */}
      {selectedDef && selectedInst && (
        <div className={styles.selectedCard}>
          <div className={styles.selectedTop}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: selectedDef.color }}
            >
              {selectedDef.symbol}
            </span>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <Text style={{ color: '#e8eefb', fontWeight: tokens.fontWeightSemibold }}>
                {selectedDef.name}
              </Text>
              <br />
              <Caption1 style={{ color: '#8496b5' }}>{selectedDef.tagline}</Caption1>
            </div>
          </div>
          <div className={styles.selectedRow}>
            <Cursor20Regular style={{ color: '#8496b5' }} fontSize={14} />
            <Caption1 style={{ color: '#8496b5', flexGrow: 1 }}>
              {selectedDef.pins.length} pins &middot; {selectedDef.difficulty}
            </Caption1>
            {selectedDef.id === 'button' && (
              <ToggleButton
                size="small"
                appearance={pressedIds.has(selectedInst.instanceId) ? 'primary' : 'subtle'}
                checked={pressedIds.has(selectedInst.instanceId)}
                onClick={() => togglePress(selectedInst.instanceId)}
              >
                {pressedIds.has(selectedInst.instanceId) ? 'Pressed' : 'Press'}
              </ToggleButton>
            )}
            <Tooltip content="Remove from board" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<Delete20Regular />}
                onClick={deleteSelected}
                aria-label="Delete selected component"
              />
            </Tooltip>
          </div>
          {selectedState?.message && (
            <Caption1
              style={{
                color:
                  selectedState.status === 'error'
                    ? STATUS.error
                    : selectedState.status === 'warning'
                      ? STATUS.warning
                      : '#8ecbff',
              }}
            >
              {selectedState.message}
            </Caption1>
          )}
        </div>
      )}

      {/* Status: wire count */}
      {placed.length > 0 && (
        <div style={{ position: 'absolute', top: '64px', right: '16px' }}>
          <Badge appearance="tint" color="informative" icon={<Link20Regular />}>
            {wires.length} {wires.length === 1 ? 'connection' : 'connections'}
          </Badge>
        </div>
      )}

      {/* Circuit check */}
      {placed.length > 0 && (
        <div className={styles.checkPanel}>
          <div className={styles.checkHead}>
            <Subtitle2
              style={{
                color: '#e8eefb',
                fontFamily: MONO_STACK,
                fontSize: '12px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Circuit check
            </Subtitle2>
            <Badge appearance="filled" color={checkBadge.color}>
              {checkBadge.text}
            </Badge>
          </div>
          <div className={styles.checkList}>
            {report.issues.map((issue, i) => {
              const meta = ISSUE_ICON[issue.severity]
              return (
                <div key={i} className={styles.checkItem}>
                  <span className={styles.checkIcon} style={{ color: meta.color }}>
                    {meta.icon}
                  </span>
                  <Caption1 style={{ color: '#c7d3ea' }}>{issue.message}</Caption1>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hint */}
      <div className={styles.hint}>
        <Info20Regular fontSize={16} />
        <Caption1 style={{ color: 'inherit' }}>{hintText}</Caption1>
      </div>
    </div>
  )
}
