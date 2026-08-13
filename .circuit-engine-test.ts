import { analyzeCircuit, type PlacedInstance, type Wire } from '@/lib/circuit-engine'

const inst = (id: string, componentId: string): PlacedInstance => ({
  instanceId: id,
  componentId,
  position: [0, 0, 0],
})

const w = (id: string, from: string, fp: number, to: string, tp: number): Wire => ({
  id,
  from: { instanceId: from, pinIndex: fp },
  to: { instanceId: to, pinIndex: tp },
})

const bat = inst('bat', 'battery')
const led = inst('led', 'led')
const res = inst('res', 'resistor')
const btn = inst('btn', 'button')
const buz = inst('buz', 'buzzer')
const cap = inst('cap', 'capacitor')
const dio = inst('dio', 'diode')
const trn = inst('trn', 'transistor')

let pass = 0
let fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) {
    pass++
    console.log(`  PASS  ${name}`)
  } else {
    fail++
    console.log(`  FAIL  ${name} ${extra}`)
  }
}
const hasCode = (r: ReturnType<typeof analyzeCircuit>, code: string) =>
  r.issues.some((i) => i.code === code)
const errCodes = (r: ReturnType<typeof analyzeCircuit>) =>
  r.issues.filter((i) => i.severity === 'error').map((i) => i.code)

console.log('--- 1. Empty board ---')
{
  const r = analyzeCircuit([], [])
  check('EMPTY_BOARD info', hasCode(r, 'EMPTY_BOARD'))
  check('no power', !r.hasPower && !r.hasClosedLoop)
}

console.log('--- 2. Battery only, no wires ---')
{
  const r = analyzeCircuit([bat], [])
  check('NO_WIRES info', hasCode(r, 'NO_WIRES'))
  check('battery present', r.batteryId === 'bat')
}

console.log('--- 3. Short circuit: BAT+ wired to BAT- ---')
{
  const r = analyzeCircuit([bat], [w('s', 'bat', 0, 'bat', 1)])
  check('SHORT_CIRCUIT error', hasCode(r, 'SHORT_CIRCUIT'))
  check('battery state error', r.states['bat']?.status === 'error')
  check('no loop', !r.hasClosedLoop)
}

console.log('--- 4. LED circuit, correct polarity, NO resistor ---')
{
  const r = analyzeCircuit(
    [bat, led],
    [w('a', 'bat', 0, 'led', 0), w('b', 'led', 1, 'bat', 1)],
  )
  check('closed loop', r.hasClosedLoop)
  check('LED lit', r.states['led']?.lit === true)
  check('LED warning (needs resistor)', r.states['led']?.status === 'warning')
  check('CIRCUIT_OK', hasCode(r, 'CIRCUIT_OK'))
}

console.log('--- 5. LED circuit, correct polarity WITH series resistor ---')
{
  const r = analyzeCircuit(
    [bat, res, led],
    [w('a', 'bat', 0, 'res', 0), w('b', 'res', 1, 'led', 0), w('c', 'led', 1, 'bat', 1)],
  )
  check('closed loop', r.hasClosedLoop)
  check('LED active + lit', r.states['led']?.status === 'active' && r.states['led']?.lit === true)
  check('resistor active', r.states['res']?.status === 'active')
  check('CIRCUIT_OK success', hasCode(r, 'CIRCUIT_OK'))
}

console.log('--- 6. LED wired BACKWARDS ---')
{
  const r = analyzeCircuit(
    [bat, led],
    [w('a', 'bat', 0, 'led', 1), w('b', 'led', 0, 'bat', 1)],
  )
  check('LED state error', r.states['led']?.status === 'error')
  check('LED not lit', r.states['led']?.lit === false)
  check('OPEN_CIRCUIT error', hasCode(r, 'OPEN_CIRCUIT'))
}

console.log('--- 7. Open loop: battery + LED, LED only wired one side ---')
{
  const r = analyzeCircuit([bat, led], [w('a', 'bat', 0, 'led', 0)])
  check('not closed', !r.hasClosedLoop)
  check('LED off', r.states['led']?.lit === false)
  check('OPEN_CIRCUIT error', hasCode(r, 'OPEN_CIRCUIT'))
}

console.log('--- 8. Button in series, unpressed then pressed ---')
{
  const placed = [bat, btn, res, led]
  const wires = [
    w('a', 'bat', 0, 'btn', 0),
    w('b', 'btn', 1, 'res', 0),
    w('c', 'res', 1, 'led', 0),
    w('d', 'led', 1, 'bat', 1),
  ]
  const open = analyzeCircuit(placed, wires, new Set())
  check('not closed while open', !open.hasClosedLoop)
  check('PRESS_BUTTON info', hasCode(open, 'PRESS_BUTTON'))
  check('button off msg', /open/.test(open.states['btn']?.message ?? ''))

  const pressed = analyzeCircuit(placed, wires, new Set(['btn']))
  check('closed when pressed', pressed.hasClosedLoop)
  check('LED lit when pressed', pressed.states['led']?.lit === true)
  check('no PRESS_BUTTON', !hasCode(pressed, 'PRESS_BUTTON'))
}

console.log('--- 9. Buzzer, correct polarity, no resistor (protected) ---')
{
  const r = analyzeCircuit(
    [bat, buz],
    [w('a', 'bat', 0, 'buz', 0), w('b', 'buz', 1, 'bat', 1)],
  )
  check('buzzer active + lit', r.states['buz']?.status === 'active' && r.states['buz']?.lit === true)
}

console.log('--- 10. Capacitor backwards ---')
{
  const r = analyzeCircuit(
    [bat, cap],
    [w('a', 'bat', 0, 'cap', 1), w('b', 'cap', 0, 'bat', 1)],
  )
  check('capacitor warning', r.states['cap']?.status === 'warning')
}

console.log('--- 11. Diode forwards & backwards ---')
{
  const fwd = analyzeCircuit(
    [bat, dio],
    [w('a', 'bat', 0, 'dio', 0), w('b', 'dio', 1, 'bat', 1)],
  )
  check('diode active forwards', fwd.states['dio']?.status === 'active')

  const rev = analyzeCircuit(
    [bat, dio],
    [w('a', 'bat', 0, 'dio', 1), w('b', 'dio', 0, 'bat', 1)],
  )
  check('diode error backwards', rev.states['dio']?.status === 'error')
}

console.log('--- 12. Transistor powered (collector/emitter in loop) ---')
{
  const r = analyzeCircuit(
    [bat, trn],
    [w('a', 'bat', 0, 'trn', 0), w('b', 'trn', 2, 'bat', 1)],
  )
  check('transistor active', r.states['trn']?.status === 'active')
  check('loop via multi-pin', r.hasClosedLoop)
}

console.log('--- 13. Dangling component not in loop ---')
{
  const res2 = inst('res2', 'resistor')
  const placed = [bat, res, res2, led]
  const wires = [
    w('a', 'bat', 0, 'res', 0),
    w('b', 'res', 1, 'led', 0),
    w('c', 'led', 1, 'bat', 1),
    // res2 hangs off the + rail but never returns to the - side
    w('d', 'bat', 0, 'res2', 0),
  ]
  const r = analyzeCircuit(placed, wires)
  check('NOT_IN_LOOP info', hasCode(r, 'NOT_IN_LOOP'))
  check('main loop intact', r.hasClosedLoop)
}

console.log('--- 14. LED bypassed (both legs same net) ---')
{
  const r = analyzeCircuit(
    [bat, led],
    [w('a', 'bat', 0, 'led', 0), w('b', 'led', 1, 'bat', 0)],
  )
  check('LED bypassed warning', r.states['led']?.status === 'warning')
  check('LED not lit', r.states['led']?.lit === false)
}

console.log('--- 15. Bad pin index / unknown instance ignored ---')
{
  const r = analyzeCircuit(
    [bat, led],
    [w('a', 'bat', 0, 'led', 0), w('b', 'led', 9, 'bat', 1), w('c', 'nope', 0, 'bat', 1)],
  )
  check('runs without crashing', r.hasClosedLoop === false)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
