import { spawn, spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { delimiter, join } from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { libraryOwners } from "./dpkg-query-cache.mjs"

const args = process.argv.slice(2)
const env = { ...process.env }
let temporary

// One package-database scan instead of one scan per library (also inside GTK's
// nested linuxdeploy). The index is fresh for each build and isolated to its child.
if (
  process.platform === "linux" &&
  env.REFLOG_DPKG_CACHE !== "0" &&
  ["build", "bundle"].includes(args[0]) &&
  !args.includes("--no-bundle")
) {
  try {
    const query = spawnSync("/usr/bin/dpkg-query", ["-S", "*.so*"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    if (query.status === 0 && query.stdout.trim()) {
      temporary = mkdtempSync(join(tmpdir(), "reflog-bundle-"))
      env.REFLOG_DPKG_INDEX = join(temporary, "owners.json")
      writeFileSync(env.REFLOG_DPKG_INDEX, JSON.stringify(libraryOwners(query.stdout)))
      const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`
      const helper = fileURLToPath(new URL("./dpkg-query-cache.mjs", import.meta.url))
      const wrapper = join(temporary, "dpkg-query")
      writeFileSync(wrapper, `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(helper)} "$@"\n`)
      chmodSync(wrapper, 0o700)
      env.PATH = `${temporary}${delimiter}${env.PATH ?? ""}`
      console.log("AppImage: temporary library-owner index enabled (copyright files preserved).")
    }
  } catch (error) {
    console.warn(`Library-owner index unavailable; using normal packaging: ${error.message}`)
  }
}

const cli = createRequire(import.meta.url).resolve("@tauri-apps/cli/tauri.js")
const child = spawn(process.execPath, [cli, ...args], { env, stdio: "inherit" })
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal))
const cleanup = () => {
  if (temporary) rmSync(temporary, { recursive: true, force: true })
}
child.on("error", (error) => {
  cleanup()
  console.error(error.message)
  process.exitCode = 1
})
child.on("exit", (code, signal) => {
  cleanup()
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1)
})
