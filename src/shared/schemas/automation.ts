import { z } from "zod"

export const automationTargetSchema = z.union([
  z.literal("repo"),
  z.literal("all-submodules"),
  z.looseObject({ submodule: z.string() }),
])

export const conditionInputSchema = z.looseObject({
  kind: z.string(),
  arg: z.string().catch(""),
})

export const triggerInputSchema = z.looseObject({
  kind: z.string(),
  path: z.string().catch(""),
})

export const automationAliasSchema = z.looseObject({
  name: z.string().trim().min(1),
  expansion: z.string(),
  color: z.string().optional(),
})

export const automationShortcutSchema = z.looseObject({
  id: z.string().catch(""),
  targetId: z.string(),
  targetType: z.enum(["recipe", "monitor"]),
  color: z.string().catch(""),
})
