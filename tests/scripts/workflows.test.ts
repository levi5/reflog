import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const workflow = (name: string) => readFileSync(resolve(process.cwd(), ".github/workflows", name), "utf8")

describe("ci workflow", () => {
  const ci = workflow("ci.yml")

  it("runs on pull requests and pushes", () => {
    expect(ci).toContain("pull_request:")
    expect(ci).toContain("push:")
  })

  it("pins node to the version file and caches pnpm", () => {
    expect(ci).toContain('node-version-file: ".nvmrc"')
    expect(ci).toContain('cache: "pnpm"')
    expect(ci).toContain("pnpm install --frozen-lockfile")
  })

  it("runs the frontend and backend checks", () => {
    expect(ci).toContain("pnpm lint")
    expect(ci).toContain("pnpm test")
    expect(ci).toContain("pnpm exec tsc --noEmit")
    expect(ci).toContain("cargo test --manifest-path src-tauri/Cargo.toml")
    expect(ci).toContain("node scripts/check-version.mjs")
  })

  it("does not build bundles", () => {
    expect(ci).not.toContain("tauri-action")
    expect(ci).not.toContain("--bundles")
  })
})

describe("release workflow", () => {
  const release = workflow("release.yml")

  it("only publishes from a version tag or a manual run", () => {
    expect(release).toContain('tags: ["v*"]')
    expect(release).toContain("workflow_dispatch:")
    expect(release).not.toContain("pull_request:")
  })

  it("can write the release", () => {
    expect(release).toContain("contents: write")
    expect(release).toContain("secrets.GITHUB_TOKEN")
  })

  it("verifies before building", () => {
    expect(release).toContain("needs: verify")
    expect(release.indexOf("needs: verify")).toBeLessThan(release.indexOf("tauri-action"))
  })

  it("builds the linux and windows bundles in the matrix", () => {
    expect(release).toContain("platform: ubuntu-22.04")
    expect(release).toContain("platform: windows-latest")
    expect(release).toContain('bundles: "--bundles deb,rpm,appimage"')
    expect(release).toContain('bundles: "--bundles nsis,msi"')
  })

  it("delegates the version guard to the shared script", () => {
    expect(release).toContain("node scripts/check-version.mjs")
    expect(release).not.toContain("jq -r .version")
  })

  it("marks beta versions as prerelease releases", () => {
    expect(release).toContain("prerelease: $")
    expect(release).toContain("steps.version.outputs.prerelease")
    expect(release).toContain("id: version")
  })

  it("names the assets with the version and publishes them as workflow artifacts", () => {
    expect(release).toContain("releaseAssetNamePattern:")
    expect(release).toContain("[name]_[version]_[platform]_[arch][setup].[ext]")
    expect(release).toContain("uploadWorkflowArtifacts: true")
    expect(release).toContain("retryAttempts: 2")
  })

  it("installs the bundler only the linux build needs", () => {
    expect(release).toContain('if: runner.os == "Linux"')
    expect(release).toContain("rpm")
  })
})
