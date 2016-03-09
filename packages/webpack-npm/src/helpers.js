'use strict'

/* @flow */

export function getRootDirectory(): string {
  // TODO: Make this actually work
  // NOTE: `npm-install-webpack-plugin` does the same by the way
  return process.cwd()
}

export function getModuleName(result: Object, loader: boolean): string {
  let moduleName = result.request
  if (loader && !moduleName.match(/\-loader$/)) {
    moduleName += '-loader'
  }
  return moduleName
}
