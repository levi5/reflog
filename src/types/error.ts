export interface AppError {
  code: string
  message: string
}

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as AppError).code === "string" &&
    typeof (err as AppError).message === "string"
  )
}

export function formatErrorMessage(err: unknown): string {
  if (isAppError(err)) {
    return err.message
  }
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}
