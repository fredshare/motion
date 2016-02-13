import opts from './opts'
import wport from './lib/wport'
import { p, handleError, log, readJSON, writeJSON } from './lib/fns'
import createWriter from './lib/createWriter'

export async function init() {
  await createWriters()
}

let writers = {
  externalsPaths: {
    read: () => writers.pathsWriter.read(),
    write: (a) => writers.pathsWriter.write(a)
  },

  externalsIn: {
    read: () => writers.externalsWriter.read(),
    write: (a) => writers.externalsWriter.write(a)
  },

  state: {
    read: () => writers.stateWriter.read(),
    write: (a) => writers.stateWriter.write(a),
  },

  packageJSON: {
    read: () => writers.package.read(),
    write: (a) => writers.package.write(a),
  }
}

async function createWriters() {
  writers.package = await createWriter(p(opts('flintDir'), 'package.json'), {
    debug: 'packageJSON',
    json: true,
    defaultValue: {}
  })

  writers.stateWriter = await createWriter(opts('stateFile'), {
    debug: 'state',
    json: true,
    defaultValue: {}
  })

  writers.pathsWriter = await createWriter(opts('deps').externalsPaths, {
    debug: 'externalsPaths',
    json: true,
    defaultValue: []
  })

  writers.externalsWriter = await createWriter(opts('deps').externalsIn, {
    debug: 'externals'
  })
}

export async function writeServerState() {
  try {
    await writers.state.write((state, write) => {
      state.port = opts('port')
      state.wport = wport()
      write(state)
    })
  }
  catch(e) {
    handleError(e)
  }
}

export default {
  init,
  ...writers,
  writeServerState
}