#!/usr/bin/env node
const semver = require('semver')
const fs = require('fs')
const tsPkg = require('typescript/package.json')
const readFileSync = fs.readFileSync
const tscPath = require.resolve('typescript/lib/tsc')

fs.readFileSync = (...args) => {
  if (args[0] === tscPath) {
    let tsc = readFileSync(...args)
    // extensions 中添加 *.mpx 文件
    tryReplace(/supportedTSExtensions = .*(?=;)/, s => s + '.concat([[".mpx"]])')
    tryReplace(/supportedJSExtensions = .*(?=;)/, s => s + '.concat([[".mpx"]])')
    tryReplace(/allSupportedExtensions = .*(?=;)/, s => s + '.concat([[".mpx"]])')

    return tsc
    // add *.mpx files to allow extensions
    function tryReplace(search, replace) {
      const before = tsc;
      tsc = tsc.replace(search, replace);
      const after = tsc;
      if (after === before) {
        throw 'Search string not found: ' + JSON.stringify(search.toString());
      }
    }
  }
  return readFileSync(...args)
}

(function main() {
  try {
    require(tscPath)
  } catch (e) {
    // tsc catch error
    console.error('tsc catch error: ', e)
  }
})()

