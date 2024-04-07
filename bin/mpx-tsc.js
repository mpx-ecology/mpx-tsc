#!/usr/bin/env node
if (process.argv.includes("--info")) {
  const pkgJSON = require("../package.json");
  console.log(`Version ${pkgJSON["version"]} (mpx-tsc)`);
} else {
  // @ts-check
  require("../lib/index.js").run();
}
