import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const TESTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..")

function readSource(relativePath: string): string {
  return readFileSync(path.resolve(TESTS_ROOT, relativePath), "utf8")
}

export function readGlobalStyles(): string {
  return readSource("src/styles/globals.scss")
}

export function readComponentStyles(componentPath: string): string {
  return readSource(`src/presentation/components/${componentPath}/style.module.scss`)
}
