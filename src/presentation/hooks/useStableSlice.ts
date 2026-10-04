import { useRef } from "react"

/**
 * Mantém a identidade do objeto enquanto nenhum dos seus campos muda de valor.
 * Sem isso, um objeto montado a partir de hooks que devolvem funcoes novas a cada
 * render invalida todos os `useMemo` a jusante e faz o contexto inteiro re-renderizar.
 */
export function useStableSlice<T extends Record<string, unknown>>(slice: T): T {
  const previous = useRef<Record<string, unknown> | null>(null)

  if (previous.current === null) {
    previous.current = slice
    return slice
  }

  const current = previous.current
  const keys = Object.keys(slice)
  const unchanged =
    keys.length === Object.keys(current).length && keys.every((key) => Object.is(slice[key], current[key]))

  if (unchanged) return current as T

  previous.current = slice
  return slice
}
