export function libraryOwners(output: string): Record<string, string>
export function cachedSearch(
  args: string[],
  owners: Record<string, string>,
): { status: number; stdout: string; stderr: string } | null
