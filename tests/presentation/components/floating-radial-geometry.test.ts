import { describe, expect, it } from "vitest"
import { radialSector } from "../../../src/presentation/components/Floating/radial-geometry"

describe("Circular radial sectors", () => {
  it.each([4, 5, 6, 8])("draws real circular arcs for %i options", (count) => {
    for (let index = 0; index < count; index++) {
      const sector = radialSector(index, count)
      expect(sector.path).toContain("A 139 139")
      expect(sector.path).toContain("A 42 42")
      expect(Math.hypot(sector.label.x - 140, sector.label.y - 140)).toBeCloseTo(92, 3)
      expect(sector.label.x).toBeGreaterThan(0)
      expect(sector.label.x).toBeLessThan(280)
    }
  })
})
