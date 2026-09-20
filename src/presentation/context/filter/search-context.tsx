import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react"

export type SearchScope = "all" | "commits" | "branches" | "files"

const VALID_SCOPES = new Set<string>(["all", "commits", "branches", "files"])

export function isSearchScope(value: string): value is SearchScope {
  return VALID_SCOPES.has(value)
}

export interface SearchContextValue {
  query: string
  setQuery: (query: string) => void
  scope: SearchScope
  setScope: (scope: SearchScope) => void
  clear: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<SearchScope>("all")

  const clear = useCallback(() => {
    setQuery("")
    setScope("all")
  }, [])

  const value = useMemo(
    () => ({
      query,
      setQuery,
      scope,
      setScope,
      clear,
    }),
    [query, scope, clear],
  )

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) {
    throw new Error("useSearch must be used within SearchProvider")
  }
  return ctx
}
