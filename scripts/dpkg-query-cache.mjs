import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

// Index only shared-library searches. All other dpkg-query operations keep their
// original behavior. linuxdeploy still copies the original copyright files.
export function libraryOwners(output) {
  const owners = Object.create(null)
  for (const line of output.split("\n")) {
    const separator = line.indexOf(": /")
    if (separator < 0) continue
    const path = line.slice(separator + 2)
    owners[path] = owners[path] ? `${owners[path]}\n${line}` : line
  }
  return owners
}

export function cachedSearch(args, owners) {
  if (args.length !== 2 || args[0] !== "-S") return null
  const path = args[1]
  if (!path.startsWith("/") || !/\.so(?:\.|$)/.test(path) || /[*?[\\]/.test(path)) return null
  const output = owners[path]
  return output
    ? { status: 0, stdout: `${output}\n`, stderr: "" }
    : { status: 1, stdout: "", stderr: `dpkg-query: no path found matching pattern ${path}\n` }
}

function main() {
  const args = process.argv.slice(2)
  try {
    const owners = JSON.parse(readFileSync(process.env.REFLOG_DPKG_INDEX, "utf8"))
    const result = cachedSearch(args, owners)
    if (result) {
      process.stdout.write(result.stdout)
      process.stderr.write(result.stderr)
      return result.status
    }
  } catch {
    // A missing/unreadable cache must never prevent the real query.
  }
  const result = spawnSync("/usr/bin/dpkg-query", args, { stdio: "inherit" })
  return result.status ?? 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main()
