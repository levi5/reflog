import { appendFileSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { isBeta, isPrerelease, nextVersion, readVersions, RELEASE_KINDS, tagFor, versionProblems } from "./version.mjs"

function read(root, path) {
  return readFileSync(resolve(root, path), "utf8")
}

function outputsFor(version) {
  const outputs = { version, prerelease: isPrerelease(version), beta: isBeta(version), tag: tagFor(version) }
  for (const kind of RELEASE_KINDS) {
    try {
      outputs[`next_${kind}`] = nextVersion(version, kind)
    } catch {
      outputs[`next_${kind}`] = ""
    }
  }
  return outputs
}

function main(argv, env) {
  const root = resolve(process.cwd())
  const versions = readVersions((path) => read(root, path))

  const tagIndex = argv.indexOf("--tag")
  if (tagIndex !== -1 && !argv[tagIndex + 1]) {
    console.error("error: --tag needs a value, for example --tag v0.1.0-beta.1")
    return 1
  }
  const refName = env.GITHUB_REF_NAME ?? ""
  const tag = (tagIndex === -1 ? "" : argv[tagIndex + 1]) || (refName.startsWith("v") ? refName : "")

  const problems = versionProblems(versions, tag)
  for (const problem of problems) console.error(`error: ${problem}`)
  if (problems.length > 0) return 1

  const outputs = outputsFor(versions.tauri)
  for (const [key, value] of Object.entries(outputs)) console.log(`${key}=${value}`)

  if (argv.includes("--github-output")) {
    if (!env.GITHUB_OUTPUT) {
      console.error("error: --github-output requires GITHUB_OUTPUT to be set")
      return 1
    }
    const lines = Object.entries(outputs)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")
    appendFileSync(env.GITHUB_OUTPUT, `${lines}\n`)
  }

  return 0
}

const argv = process.argv.slice(2)
if (argv.includes("--help")) {
  console.log("usage: node scripts/check-version.mjs [--tag v0.1.0-beta.1] [--github-output]")
} else {
  process.exit(main(argv, process.env))
}
