import opts from '../opts'

let debug = false

const subIcons = {
  IN: ' ⇠ '.blue,
  OUT: ' ⇢ '.bold.green,
  SIN: ' ⇜ '.magenta,
  SOUT: ' ⇝ '.bold.yellow,
  RELOAD: ' ↺ '.yellow,
  STAR: ' ★ '.yellow,
  PIPE: ' | '.gray,
  CHECK: ' ✓ ',
  X: ' ✖ ',
  PLUS: ' ✚ ',
  ASTERISK: ' ✺ ',
  HAPPY: ' ☺ ',
  SAD: ' ☹ ',
  WRITE: ' ✍ ',
  DOWN: ' ↓ ',
  UP: ' ↑ ',
}

export default function log(info, subIcon, ...args) {
  if (!debug) return

  const isInfo = typeof info == 'object' && info.name && info.icon

  let name, icon, subiout

  if (isInfo) {
    const subi = subIcons[subIcon]
    subiout = subi ? subi : `    ${subIcon}`
    args = [info.icon, subiout, ...args]
  }
  else
    args = [info, subIcon, ...args]

  const doLog = () => console.log(...colorArgs(args))

  // all
  if (!debug.length) return doLog()
  // filtered
  if (name && debug.indexOf(name) >= 0) doLog()
}

log.externals = log.bind(null, { name: 'externals', icon: '🚀' })
log.internals = log.bind(null, { name: 'internals', icon: '🏠' })
log.cache = log.bind(null, { name: 'cache', icon: '💰' })
log.opts = log.bind(null, { name: 'opts', icon: '❍' })
log.gulp = log.bind(null, { name: 'gulp', icon: '👇' })
log.writer = log.bind(null, { name: 'writer', icon: '✎' })

function colorArgs(args) {
  return args.map(arg =>
    typeof arg === 'boolean' ? !!arg ? `${arg}`.bold.green : `${arg}`.bold.red
    : arg
  )
}

log.setLogging = function() {
  debug = opts('debug')
}