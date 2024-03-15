#!/usr/bin/env node
// @ts-check
if (process.argv.includes("--info")) {
  const pkgJSON = require("../package.json");
  console.log(`Version ${pkgJSON["version"]} (mpx-tsc)`);
} else {
  require("../lib/index.js").run();
}
