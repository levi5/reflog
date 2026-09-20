import { createContext, useContext } from "react"
import type { TabsContextValue } from "../../../types/components/tabs"

export const TabsContext = createContext<TabsContextValue | null>(null)

export function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs compound components must be used within a <Tabs> component")
  }
  return context
}
