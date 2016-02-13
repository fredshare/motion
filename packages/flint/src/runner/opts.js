import path from 'path'
import { p, log, sanitize, handleError, readJSON, readFile, exists } from './lib/fns'
import disk from './disk'
import util from 'util'
import webpack from 'webpack'
import getWebpackErrors from './bundler/lib/getWebpackErrors'

let OPTS = {}

export async function init(cli) {
  try {
    // init
    OPTS.appDir = path.normalize(process.cwd())
    OPTS.name = cli.name || path.basename(process.cwd())
    OPTS.saneName = sanitize(cli.name)
    OPTS.hasRunInitialBuild = false
    OPTS.defaultPort = 4000

    setupCliOpts(cli)
    setupDirs()

    // config
    const config = await loadConfigs(cli)
    setupConfig(cli, config)
  }
  catch(e) {
    handleError(e)
  }
}

async function loadConfigs() {
  const file = await parseConfig()
  let result

  if (file) {
    // const userConf = require('./.flint/.internal/user-config')
    // TODO not eval or at least return export properly, also whitelist options
    const out = await readFile(file)
    result = eval(out)
  }
  else {
    result = await jsonConfig()
  }

  return modeMergedConfig(result || {})
}

function modeMergedConfig(config) {
  const modeSpecificConfig = config[OPTS.build ? 'build' : 'run']
  const merged = Object.assign({}, config, modeSpecificConfig)
  return merged
}

async function jsonConfig() {
  try {
    const config = await readJSON(OPTS.configFile)
    return modeMergedConfig(config)
  }
  catch(e) {
    handleError({ message: `Error parsing config file: ${OPTS.configFile}` })
  }
}

function parseConfig() {
  return new Promise(async (resolve, reject) => {
    const confLocation = p(OPTS.flintDir, 'config.js')

    try {
      try {
        await exists(confLocation)
      }
      catch(e) {
        resolve(false)
      }

      // for json loader
      const runnerRoot = path.resolve(path.join(__dirname, '..', '..'))
      const runnerModules = path.join(runnerRoot, 'node_modules')

      webpack({
        context: OPTS.flintDir,
        entry: './config.js',
        output: {
          filename: 'user-config.js',
          path: './.flint/.internal',
          libraryTarget: 'commonjs2'
        },
        module: {
          loaders: [
            { test: /\.json$/, loader: 'json' }
          ]
        },
        resolveLoader: { root: runnerModules },
      }, (err, stats) => {
        if (getWebpackErrors('config', err, stats))
          resolve(false)
        else
          resolve(p(OPTS.internalDir, 'user-config.js'))
      })
    }
    catch(e) {
      handleError(e)
    }
  })
}

async function setupCliOpts(cli) {
  OPTS.version = cli.version
  OPTS.debug = cli.debug
  OPTS.watch = cli.watch
  OPTS.reset = cli.reset
  OPTS.build = cli.build
  OPTS.out = cli.out

  // ensure we dont clobber things
  if (cli.out && (await exists(cli.out)))  {
    console.error(`\n  Build dir already exists! Ensure you target an empty directory.\n`.red)
    process.exit(1)
  }
}

function setupDirs() {
  // base dirs
  OPTS.flintDir = p(OPTS.appDir, '.flint')
  OPTS.modulesDir = p(OPTS.flintDir, 'node_modules')
  OPTS.internalDir = p(OPTS.flintDir, '.internal')
  OPTS.template = OPTS.template || '.flint/index.html'
  OPTS.buildDir = OPTS.out ? p(OPTS.out) : p(OPTS.flintDir, 'build')

  // deps dirs
  OPTS.deps = {}
  OPTS.deps.dir = p(OPTS.internalDir, 'deps')
  OPTS.deps.internalDir = p(OPTS.internalDir, 'deps', 'internal')
  OPTS.deps.assetsDir = p(OPTS.deps.dir, 'assets')
  OPTS.deps.internalsIn = p(OPTS.deps.dir, 'internals.in.js')
  OPTS.deps.internalsOut = p(OPTS.deps.dir, 'internals.js')
  OPTS.deps.externalsIn = p(OPTS.deps.dir, 'externals.in.js')
  OPTS.deps.externalsOut = p(OPTS.deps.dir, 'externals.js')
  OPTS.deps.externalsPaths = p(OPTS.deps.dir, 'externals.paths.js')

  OPTS.configFile = p(OPTS.flintDir, 'flint.json')
  OPTS.stateFile = p(OPTS.internalDir, 'state.json')
  OPTS.outDir = p(OPTS.internalDir, 'out')
  OPTS.styleDir = p(OPTS.internalDir, 'styles')
  OPTS.styleOutDir = p(OPTS.buildDir, '_')
  OPTS.styleOutName = 'styles.css'
}

function setupConfig(cli, config) {
  // config
  OPTS.config = Object.assign(
    {
      minify: true,
      debug: false,
      routing: true
    },
    config
  )

  // cli overrides config
  if (cli.nomin) OPTS.config.minify = false
  if (cli.pretty) OPTS.config.pretty = true
  if (cli.port) OPTS.config.port = cli.port
  if (cli.host) OPTS.config.host = cli.host
}

export function set(key, val) {
  log.opts('opts.set'.bold.yellow, key, val)
  OPTS[key] = val
  return val
}

export function get(key) {
  return key ? OPTS[key] : OPTS
}

export async function serialize() {
  await disk.state.write((state, write) => {
    state.opts = { ...OPTS }
    delete state.opts.state // prevent circular structure
    write(state)
  })
}

export function debug() {
  print(util.inspect(OPTS, false, 10))
}



// this is bit funky, but lets us do:
//   opts('dir') => path
//   opts.set('dir', 'other')

function opts(name) {
  return get(name)
}

opts.set = set
opts.init = init
opts.serialize = serialize
opts.debug = debug

export default opts