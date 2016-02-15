import { writeInstalled, readInstalled, readInstalledCache } from './lib/installed'
import { _, log, handleError } from '../lib/fns'
import cache from '../cache'
import opts from '../opts'
import { onStart, onFinish, onError } from './lib/messages'
import npm from './lib/npm'
import normalize from './lib/normalize'
import remakeInstallDir from './lib/remakeInstallDir'
import { uninstall } from './uninstall'
import { externals } from './externals'

// ensures all packages installed, uninstalled, written out to bundle
export async function install(force) {
  log.externals('install')
  try {
    await remakeInstallDir(force)
    await uninstall()
    await installAll()
    await externals({ force })
  }
  catch (e) {
    handleError(e)
    throw new Error(e)
  }
}

let successful = []
let failed = []
let installingFullNames = []
let installing = []
let _isInstalling = false

// used to quickly check if a file will trigger an install
export function willInstall(imports) {
  // TODO dont ignore internals
  return !!getNew(imports.filter(x => x.charAt(0) != '.')).length
}

// finds the new externals to install
export function getNew(requires, installed = readInstalledCache()) {
  if (!requires.length) return requires

  const names = normalize(requires)
  if (!names.length) return names

  const fresh = _.difference(names, installed, installing)
  // log.externals('DOWN', '  ', names, '- ', installed, '- ', installing, '  = ', fresh)
  return fresh
}

export async function installAll(requires) {
  try {
    requires = requires || cache.getExternals()

    // nothing to install
    if (!requires.length && !_isInstalling && opts('finishingFirstBuild'))
      opts.set('hasRunInitialInstall', true)

    if (!requires.length)
      return requires

    // determine whats new
    const installed = await readInstalled()
    const fresh = await getNew(requires, installed)

    log.externals('installAll fresh', fresh)

    // nothing new
    if (!fresh.length) {
      if (!_isInstalling && opts('finishingFirstBuild'))
        opts.set('hasRunInitialInstall', true)

      // new motion excluded require like babel-runtime, see rmExternals
      if (requires.length) {
        await writeInstalled(installed)
        await externals({ silent: true })
      }
      return
    }

    // track full require paths "babel-runtime/interop/etc"
    installingFullNames = installingFullNames.concat(requires)

    // push installing
    installing = installing.concat(fresh)

    // check if already installing stuff
    if (_isInstalling)
      return await finishedInstalls()

    // install!
    _isInstalling = true
    await runInstall(installed)
  }
  catch(e) {
    handleError(e)
  }
}

function runInstall(prevInstalled, toInstall) {
  let isDone = false

  async function installNext() {
    const dep = installing[0]

    // ignore empty
    if (dep === '') {
      installing.shift()
      return
    }

    onStart(dep)

    try {
      await npm.save(dep)
      log.externals('install', 'succces, saved', dep)
      successful.push(dep)
      onFinish(dep)
    }
    catch(e) {
      console.error(`\n  ${e.message}`.red)
      failed.push(dep)
      log.externals('package install failed', dep, e.message, e.stack)
      onError(dep, e)
    }
    finally {
      let installed = installing.shift()

       // remove
      log.externals('install, finally:', installing)
      next()
    }
  }

  function next() {
    log.externals('next #', installing.length)
    return installing.length ? installNext() : done()
  }

  async function done() {
    const installedFullPaths = _.uniq(_.flattenDeep(_.compact(installingFullNames)))
    let finalPaths = _.uniq([].concat(prevInstalled, installedFullPaths))
    log.externals('DONE, finalPaths', finalPaths)

    // remove failed
    if (failed && failed.length)
      finalPaths = finalPaths.filter(dep => failed.indexOf(dep) >= 0)

    logInstalled(successful)
    await writeInstalled(finalPaths, toInstall)
    await externals()

    // reset
    installingFullNames = []
    failed = []
    _isInstalling = false
    opts.set('hasRunInitialInstall', true)
    isDone = true
  }

  return new Promise(res => {
    // start
    installNext()

    let finish = setInterval(() => {
      if (isDone) {
        clearInterval(finish)
        finishedWatchers.forEach(w => w())
        res()
      }
    }, 50)
  })
}

// to ensure we wait for installs
let finishedWatchers = []
function finishedInstalls() {
  return new Promise(res => {
    finishedWatchers.push(() => {
      res()
    })
  })
}

function logInstalled(deps) {
  if (!deps.length) return
  deps = _.uniq(deps) // TODO this is fixing a bug upwards
  print(`\n  Installed ${deps.length} packages`.dim)
  deps.forEach(dep => print(`  ✓ ${dep}`.green))
}

export function isInstalling() {
  log.externals('isInstalling()', _isInstalling)
  return _isInstalling
}

// check for install finish
export function finishedInstalling() {
  return new Promise(finishedInstallingLoop)
}

function isDone() {
  return (opts('build') && !opts('watch'))
    ? !_isInstalling && opts('hasRunInitialInstall')
    : !_isInstalling
}

function finishedInstallingLoop(res) {
  if (isDone()) res()
  else {
    setTimeout(() => finishedInstallingLoop(res), 100)
  }
}