import { createContext, type ReactNode, useContext, useMemo } from "react"
import type { Material } from "../../../types"
import { usePersistentSetting, versionedKey } from "../../../infrastructure/storage/versioned-storage"

const MATERIAL_KEY = "material"
export const MATERIAL_STORAGE_KEY = versionedKey(MATERIAL_KEY)
const DEFAULT_MATERIAL: Material = "solid"

const VALID_MATERIALS: Record<string, Material> = {
  solid: "solid",
  mica: "mica",
  acrylic: "acrylic",
}

function parseMaterial(raw: string): Material {
  return VALID_MATERIALS[raw] ?? DEFAULT_MATERIAL
}

export interface MaterialContextValue {
  material: Material
  setMaterial: (material: Material) => void
}

const MaterialContext = createContext<MaterialContextValue | null>(null)

export function MaterialProvider({ children }: { children: ReactNode }) {
  const [material, setMaterial] = usePersistentSetting<Material>(MATERIAL_KEY, DEFAULT_MATERIAL, {
    parse: parseMaterial,
    normalize: parseMaterial,
    apply: (nextMaterial) => {
      document.documentElement.dataset.material = nextMaterial
    },
  })

  const value = useMemo(() => ({ material, setMaterial }), [material, setMaterial])

  return <MaterialContext.Provider value={value}>{children}</MaterialContext.Provider>
}

export function useMaterial(): MaterialContextValue {
  const context = useContext(MaterialContext)
  if (!context) {
    throw new Error("useMaterial must be used within MaterialProvider")
  }
  return context
}
