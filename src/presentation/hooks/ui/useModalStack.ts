const stack: symbol[] = []

export function pushModal(id: symbol): () => void {
  stack.push(id)
  return () => {
    const index = stack.lastIndexOf(id)
    if (index >= 0) stack.splice(index, 1)
  }
}

export function isTopModal(id: symbol): boolean {
  return stack[stack.length - 1] === id
}

export function modalStackDepth(): number {
  return stack.length
}
