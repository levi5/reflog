const SEMVER_IDENTIFIER = "(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)"
const SEMVER_PATTERN = new RegExp(
  `^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)` +
    `(?:-(${SEMVER_IDENTIFIER}(?:\\.${SEMVER_IDENTIFIER})*))?` +
    `(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$`,
)

export const RELEASE_KINDS = ["patch", "minor", "beta", "promote"]

export function parseVersion(version) {
  const match = SEMVER_PATTERN.exec(typeof version === "string" ? version.trim() : "")
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  }
}

export function isPrerelease(version) {
  const parsed = parseVersion(version)
  return parsed !== null && parsed.prerelease.length > 0
}

export function isBeta(version) {
  const parsed = parseVersion(version)
  return parsed !== null && parsed.prerelease[0] === "beta"
}

export function tagFor(version) {
  return `v${String(version).trim()}`
}

export function jsonVersion(text) {
  try {
    return String(JSON.parse(text)?.version ?? "")
  } catch {
    return ""
  }
}

export function cargoVersion(text) {
  const packageSection = /^\[package\][^[]*/m.exec(text)?.[0] ?? ""
  return /^\s*version\s*=\s*"([^"]+)"/m.exec(packageSection)?.[1] ?? ""
}

export function readVersions(read) {
  return {
    package: jsonVersion(read("package.json")),
    cargo: cargoVersion(read("src-tauri/Cargo.toml")),
    tauri: jsonVersion(read("src-tauri/tauri.conf.json")),
  }
}

export function nextVersion(current, kind) {
  const parsed = parseVersion(current)
  if (!parsed) throw new Error(`invalid semver: ${current}`)
  const { major, minor, patch, prerelease } = parsed
  const base = `${major}.${minor}.${patch}`

  if (kind === "patch") return `${major}.${minor}.${patch + 1}`
  if (kind === "minor") return `${major}.${minor + 1}.0`
  if (kind === "beta") {
    if (prerelease.length === 0) return `${base}-beta.1`
    const [channel, counter] = prerelease
    if (channel !== "beta") return `${base}-beta.1`
    return `${base}-beta.${(Number(counter) || 0) + 1}`
  }
  if (kind === "promote") {
    if (prerelease.length === 0) throw new Error(`${current} is not a prerelease`)
    return base
  }
  throw new Error(`unknown release kind: ${kind} (expected ${RELEASE_KINDS.join(", ")})`)
}

export function versionProblems(versions, tag = "") {
  const problems = []
  const sources = [
    ["package.json", versions.package],
    ["src-tauri/Cargo.toml", versions.cargo],
    ["src-tauri/tauri.conf.json", versions.tauri],
  ]

  for (const [file, version] of sources) {
    if (!version) {
      problems.push(`${file}: version not found`)
      continue
    }
    if (!parseVersion(version)) problems.push(`${file}: ${version} is not a valid semver`)
  }

  const distinct = new Set(sources.map(([, version]) => version))
  if (distinct.size > 1) {
    const detail = sources.map(([file, version]) => `${file}=${version}`).join(" ")
    problems.push(`versions out of sync: ${detail}`)
  }

  if (tag && distinct.size === 1) {
    const [version] = distinct
    const expected = tagFor(version)
    if (tag !== expected) {
      problems.push(`tag ${tag} does not match version ${version} (expected ${expected})`)
    }
  }

  return problems
}
