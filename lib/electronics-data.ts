export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export type ShapeKind =
  | 'resistor'
  | 'led'
  | 'capacitor'
  | 'battery'
  | 'button'
  | 'potentiometer'
  | 'diode'
  | 'transistor'
  | 'ic'
  | 'register'
  | 'board'
  | 'esp32'
  | 'sensor'
  | 'buzzer'
  | 'breadboard'

export interface Pin {
  name: string
  role: string
  /** Electrical polarity for polarized components (LED, diode, electrolytic cap, battery, buzzer). */
  polarity?: 'positive' | 'negative'
}

export interface ElectronicsComponent {
  id: string
  name: string
  category: string
  difficulty: Difficulty
  color: string
  shape: ShapeKind
  tagline: string
  summary: string
  howItWorks: string
  pins: Pin[]
  uses: string[]
  funFact: string
  symbol: string
}

export const COMPONENTS: ElectronicsComponent[] = [
  {
    id: 'resistor',
    name: 'Resistor',
    category: 'Passive',
    difficulty: 'Beginner',
    color: '#c9a06a',
    shape: 'resistor',
    tagline: 'Limits and controls current flow',
    summary:
      'A resistor opposes the flow of electric current. It is the most common component you will ever place on a breadboard, used to protect other parts and set voltage levels.',
    howItWorks:
      'Resistance follows Ohm\u2019s Law: V = I \u00d7 R. For a fixed voltage, a larger resistance means less current. The colored bands printed on the body encode the resistance value in ohms and its tolerance.',
    pins: [
      { name: 'Lead A', role: 'Terminal (non-polarized)' },
      { name: 'Lead B', role: 'Terminal (non-polarized)' },
    ],
    uses: ['Current limiting for LEDs', 'Voltage dividers', 'Pull-up / pull-down on inputs'],
    funFact: 'Resistors are non-polarized \u2014 you can connect them either way around.',
    symbol: 'R',
  },
  {
    id: 'led',
    name: 'LED',
    category: 'Output',
    difficulty: 'Beginner',
    color: '#e5484d',
    shape: 'led',
    tagline: 'Light Emitting Diode',
    summary:
      'An LED turns electric current into light. It is polarized, meaning current only flows one way, and it almost always needs a series resistor to survive.',
    howItWorks:
      'Current enters the longer leg (anode, +) and exits the shorter leg (cathode, \u2212). When electrons cross the semiconductor junction they release energy as photons \u2014 visible light.',
    pins: [
      { name: 'Anode (+)', role: 'Longer leg, connects toward positive', polarity: 'positive' },
      { name: 'Cathode (\u2212)', role: 'Shorter leg, connects toward ground', polarity: 'negative' },
    ],
    uses: ['Status indicators', 'Displays and signage', 'Optical sensors'],
    funFact: 'Without a series resistor an LED can burn out in a fraction of a second.',
    symbol: 'LED',
  },
  {
    id: 'capacitor',
    name: 'Capacitor',
    category: 'Passive',
    difficulty: 'Beginner',
    color: '#3b82f6',
    shape: 'capacitor',
    tagline: 'Stores and releases charge',
    summary:
      'A capacitor stores electrical energy in an electric field. It is used to smooth voltage, filter noise, and provide bursts of current.',
    howItWorks:
      'Two conductive plates are separated by an insulator. Charge builds up on the plates and is released later. Capacitance is measured in farads (usually \u00b5F, nF, pF).',
    pins: [
      { name: 'Positive (+)', role: 'Longer leg (electrolytic types)', polarity: 'positive' },
      { name: 'Negative (\u2212)', role: 'Marked with a stripe', polarity: 'negative' },
    ],
    uses: ['Power supply smoothing', 'Noise decoupling', 'Timing circuits'],
    funFact: 'Electrolytic capacitors are polarized and can pop if connected backwards.',
    symbol: 'C',
  },
  {
    id: 'diode',
    name: 'Diode',
    category: 'Semiconductor',
    difficulty: 'Beginner',
    color: '#6b7280',
    shape: 'diode',
    tagline: 'One-way valve for current',
    summary:
      'A diode allows current to flow in only one direction. It is the building block behind rectifiers and reverse-polarity protection.',
    howItWorks:
      'Current flows from anode to cathode when forward-biased (about 0.7V drop for silicon). In reverse it blocks current until its breakdown voltage.',
    pins: [
      { name: 'Anode (+)', role: 'Current enters here', polarity: 'positive' },
      { name: 'Cathode (\u2212)', role: 'Marked with a stripe, current exits', polarity: 'negative' },
    ],
    uses: ['Converting AC to DC', 'Protecting circuits from reverse voltage', 'Signal clamping'],
    funFact: 'An LED is just a special diode that also emits light.',
    symbol: 'D',
  },
  {
    id: 'transistor',
    name: 'Transistor (BJT)',
    category: 'Semiconductor',
    difficulty: 'Intermediate',
    color: '#111827',
    shape: 'transistor',
    tagline: 'Electronic switch and amplifier',
    summary:
      'A transistor uses a small current or voltage to control a much larger one. It is the foundation of all modern electronics and computing.',
    howItWorks:
      'In an NPN BJT a small current into the Base lets a large current flow from Collector to Emitter. Tiny changes at the base are amplified at the output.',
    pins: [
      { name: 'Base', role: 'Control input' },
      { name: 'Collector', role: 'Main current in' },
      { name: 'Emitter', role: 'Main current out' },
    ],
    uses: ['Switching high-power loads', 'Signal amplification', 'Logic gates'],
    funFact: 'A modern CPU contains tens of billions of microscopic transistors.',
    symbol: 'Q',
  },
  {
    id: 'button',
    name: 'Push Button',
    category: 'Input',
    difficulty: 'Beginner',
    color: '#ef4444',
    shape: 'button',
    tagline: 'Momentary tactile switch',
    summary:
      'A push button closes a circuit while pressed and opens it when released. It is the simplest way to get user input into a circuit.',
    howItWorks:
      'Pressing the cap bridges two internal contacts, completing the circuit. Microcontrollers usually read it with a pull-up or pull-down resistor to avoid a floating pin.',
    pins: [
      { name: 'Pin 1', role: 'Contact side A' },
      { name: 'Pin 2', role: 'Contact side B' },
    ],
    uses: ['Reset buttons', 'User controls', 'Menu navigation'],
    funFact: 'Buttons "bounce" \u2014 they flicker on/off for milliseconds, so code often debounces them.',
    symbol: 'SW',
  },
  {
    id: 'potentiometer',
    name: 'Potentiometer',
    category: 'Input',
    difficulty: 'Beginner',
    color: '#0ea5e9',
    shape: 'potentiometer',
    tagline: 'Adjustable resistor / knob',
    summary:
      'A potentiometer is a resistor you can turn. It produces a variable voltage, perfect for volume knobs, dimmers, and analog inputs.',
    howItWorks:
      'A wiper slides along a resistive track between the two outer pins. The middle pin outputs a voltage proportional to the knob position \u2014 a classic voltage divider.',
    pins: [
      { name: 'Pin 1', role: 'One end of track' },
      { name: 'Wiper', role: 'Variable output (middle)' },
      { name: 'Pin 3', role: 'Other end of track' },
    ],
    uses: ['Volume and brightness control', 'Analog sensor input', 'Calibration trimmers'],
    funFact: 'Turning the knob physically moves a tiny contact across a carbon strip.',
    symbol: 'POT',
  },
  {
    id: 'battery',
    name: 'Battery',
    category: 'Power',
    difficulty: 'Beginner',
    color: '#22c55e',
    shape: 'battery',
    tagline: 'Portable source of DC power',
    summary:
      'A battery supplies a steady DC voltage that powers your circuit. It has a positive and a negative terminal.',
    howItWorks:
      'Chemical reactions inside push electrons out of the negative terminal, through your circuit, and back into the positive terminal. Voltage stays roughly constant until it depletes.',
    pins: [
      { name: 'Positive (+)', role: 'Higher potential terminal', polarity: 'positive' },
      { name: 'Negative (\u2212)', role: 'Ground / return', polarity: 'negative' },
    ],
    uses: ['Powering portable projects', 'Backup power', 'Reference voltage'],
    funFact: 'Connecting batteries in series adds their voltages; in parallel adds capacity.',
    symbol: 'BAT',
  },
  {
    id: 'buzzer',
    name: 'Piezo Buzzer',
    category: 'Output',
    difficulty: 'Beginner',
    color: '#1f2937',
    shape: 'buzzer',
    tagline: 'Turns electricity into sound',
    summary:
      'A piezo buzzer makes a tone when voltage is applied. It is a cheap, simple way to add audible feedback to a project.',
    howItWorks:
      'A piezoelectric disc physically flexes when voltage is applied. Switching the voltage on and off rapidly makes it vibrate and produce sound at that frequency.',
    pins: [
      { name: 'Positive (+)', role: 'Signal / drive', polarity: 'positive' },
      { name: 'Negative (\u2212)', role: 'Ground', polarity: 'negative' },
    ],
    uses: ['Alarms and alerts', 'Button click feedback', 'Simple melodies'],
    funFact: 'The same piezo effect works in reverse \u2014 squeezing it generates a voltage.',
    symbol: 'BZ',
  },
  {
    id: 'ic555',
    name: '555 Timer IC',
    category: 'Integrated Circuit',
    difficulty: 'Intermediate',
    color: '#374151',
    shape: 'ic',
    tagline: 'The legendary timing chip',
    summary:
      'The 555 is one of the most popular chips ever made. It generates precise time delays and oscillations with just a few external parts.',
    howItWorks:
      'Internally it uses comparators and a flip-flop. With a resistor and capacitor you set the timing. It runs in monostable (one pulse) or astable (continuous oscillation) modes.',
    pins: [
      { name: 'VCC', role: 'Power +' },
      { name: 'GND', role: 'Ground' },
      { name: 'Trigger', role: 'Starts the timing' },
      { name: 'Output', role: 'Pulse output' },
    ],
    uses: ['Blinking LEDs', 'PWM signals', 'Tone generation'],
    funFact: 'Billions of 555 timers are still produced every year, decades after its 1972 launch.',
    symbol: 'IC',
  },
  {
    id: 'ultrasonic',
    name: 'Ultrasonic Sensor',
    category: 'Sensor',
    difficulty: 'Intermediate',
    color: '#8b5cf6',
    shape: 'sensor',
    tagline: 'Measures distance with sound',
    summary:
      'The HC-SR04 measures distance by bouncing ultrasonic pulses off objects, like sonar. A favorite for robots and obstacle avoidance.',
    howItWorks:
      'It sends a burst of ultrasound from the Trig pin, then times how long the echo takes to return on the Echo pin. Distance = (time \u00d7 speed of sound) / 2.',
    pins: [
      { name: 'VCC', role: 'Power +5V' },
      { name: 'Trig', role: 'Trigger the pulse' },
      { name: 'Echo', role: 'Returns the timing pulse' },
      { name: 'GND', role: 'Ground' },
    ],
    uses: ['Obstacle detection', 'Parking sensors', 'Level measurement'],
    funFact: 'It works just like a bat\u2019s echolocation, at frequencies too high to hear.',
    symbol: 'US',
  },
  {
    id: 'register',
    name: 'Shift Register (74HC595)',
    category: 'Integrated Circuit',
    difficulty: 'Intermediate',
    color: '#20242e',
    shape: 'register',
    tagline: 'Serial in, parallel out — expands outputs',
    summary:
      'A shift register takes in one bit at a time on a single data line and shifts it through an internal chain, turning it into 8 parallel outputs. The 74HC595 is the classic 16-pin DIP version, and it is how a microcontroller drives many LEDs or a 7-segment display using just three wires.',
    howItWorks:
      'Each rising edge of the shift clock (SRCLK) shifts the bits along one position: the value on SER enters the first stage and every bit moves one step closer to QH. When the latch clock (RCLK) pulses, the 8 held bits are copied to the parallel outputs QA\u2013QH all at once. Bits pushed past QH fall out on QH\u2032, so you can daisy-chain chips for even more outputs.',
    pins: [
      { name: 'QB', role: 'Parallel output B' },
      { name: 'QC', role: 'Parallel output C' },
      { name: 'QD', role: 'Parallel output D' },
      { name: 'QE', role: 'Parallel output E' },
      { name: 'QF', role: 'Parallel output F' },
      { name: 'QG', role: 'Parallel output G' },
      { name: 'QH', role: 'Parallel output H' },
      { name: 'GND', role: 'Ground (0V)' },
      { name: 'QH\u2032', role: 'Cascade output — feeds the next chip' },
      { name: '/SRCLR', role: 'Shift register clear (active low)' },
      { name: 'SRCLK', role: 'Shift clock — shifts on rising edge' },
      { name: 'RCLK', role: 'Latch clock — copies bits to outputs' },
      { name: '/OE', role: 'Output enable (active low)' },
      { name: 'SER', role: 'Serial data input' },
      { name: 'QA', role: 'Parallel output A' },
      { name: 'VCC', role: 'Power (5V)' },
    ],
    uses: [
      'Driving many LEDs from a few pins',
      '7-segment display drivers',
      'Daisy-chained LED walls and matrices',
    ],
    funFact:
      'With three wires you can control thousands of outputs \u2014 every 74HC595 you chain adds 8 more outputs without using another microcontroller pin.',
    symbol: 'REG',
  },
  {
    id: 'arduino',
    name: 'Arduino Uno',
    category: 'Microcontroller',
    difficulty: 'Intermediate',
    color: '#0f9d9d',
    shape: 'board',
    tagline: 'The brain of your project',
    summary:
      'An Arduino is a programmable microcontroller board. It reads sensors, runs your code, and drives outputs \u2014 the central hub of most beginner projects.',
    howItWorks:
      'You write code on a computer and upload it over USB. The ATmega chip runs your program in a loop, reading its input pins and controlling its output pins with precise timing.',
    pins: [
      { name: '5V / 3.3V', role: 'Power outputs' },
      { name: 'GND', role: 'Ground' },
      { name: 'Digital I/O', role: 'On/off pins (some do PWM)' },
      { name: 'Analog In', role: 'Read varying voltages' },
    ],
    uses: ['Robotics', 'Home automation', 'Data logging & IoT'],
    funFact: 'Arduino was created in Italy in 2005 to help design students learn electronics.',
    symbol: 'MCU',
  },
  {
    id: 'esp32',
    name: 'ESP32',
    category: 'Microcontroller',
    difficulty: 'Advanced',
    color: '#1b2430',
    shape: 'esp32',
    tagline: 'Wi-Fi + Bluetooth microcontroller',
    summary:
      'The ESP32 is a powerful, low-cost microcontroller with built-in Wi-Fi and Bluetooth. Its dual-core processor and dozens of GPIO pins make it the go-to brain for connected IoT projects.',
    howItWorks:
      'A dual-core Xtensa CPU runs your firmware while an integrated radio handles Wi-Fi and Bluetooth. The silver metal can shields the RF circuitry, and most GPIO pins can be freely remapped to peripherals like I2C, SPI, PWM, and ADC.',
    pins: [
      { name: '3V3', role: 'Regulated 3.3V power out', polarity: 'positive' },
      { name: 'GND', role: 'Ground / return', polarity: 'negative' },
      { name: 'GPIO2', role: 'Digital I/O (onboard LED)' },
      { name: 'VIN', role: '5V input from USB / battery', polarity: 'positive' },
      { name: 'EN', role: 'Chip enable / reset' },
      { name: 'GPIO4', role: 'Digital I/O (ADC / touch capable)' },
    ],
    uses: ['Wi-Fi & Bluetooth IoT devices', 'Smart home controllers', 'Battery-powered sensors'],
    funFact: 'The ESP32 runs two CPU cores at up to 240 MHz \u2014 yet often costs only a few dollars.',
    symbol: 'ESP',
  },
]

export const CATEGORIES = Array.from(new Set(COMPONENTS.map((c) => c.category)))

export function getComponent(id: string) {
  return COMPONENTS.find((c) => c.id === id)
}
