export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth"
}

export function scrollIntoViewSafely(
  target: Element | null | undefined,
  options?: { block?: ScrollLogicalPosition; inline?: ScrollLogicalPosition },
): void {
  if (!target) return
  target.scrollIntoView({ behavior: scrollBehavior(), block: options?.block ?? "nearest", inline: options?.inline })
}
