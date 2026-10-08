export interface ParsedVersion {
  major: number
  minor: number
  patch: number
  prerelease: string[]
}

export interface VersionSources {
  package: string
  cargo: string
  tauri: string
}

export type ReleaseKind = "patch" | "minor" | "beta" | "promote"

export declare const RELEASE_KINDS: ReleaseKind[]

export declare function parseVersion(version?: string | null): ParsedVersion | null
export declare function isPrerelease(version?: string | null): boolean
export declare function isBeta(version?: string | null): boolean
export declare function nextVersion(version: string, kind: string): string
export declare function cargoVersion(toml: string): string
export declare function jsonVersion(contents: string): string
export declare function readVersions(read: (file: string) => string): VersionSources
export declare function versionProblems(versions: VersionSources, tag?: string): string[]
export declare function tagFor(version: string): string
