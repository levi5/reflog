import { _Either } from "funcio"
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export type MessageType = "error" | "success" | "response" | "info" | "loading"

export interface MessageOptions {
  title?: string
  duration?: number
}

export interface AsyncMessageConfig<T = unknown> {
  loading: string
  success?: string | ((result: T) => string)
  error?: string | ((err: unknown) => string)
}

export interface MessageItem {
  id: string
  type: MessageType
  title?: string
  text: string
  duration: number
  createdAt: number
}

export interface MessageContextValue {
  messages: MessageItem[]
  notify: (type: MessageType, text: string, options?: MessageOptions) => string
  error: (text: string, title?: string, options?: MessageOptions) => string
  success: (text: string, title?: string, options?: MessageOptions) => string
  response: (text: string, title?: string, options?: MessageOptions) => string
  loading: (text: string, title?: string, options?: MessageOptions) => string
  runAsync: <T>(action: () => Promise<T>, messages: AsyncMessageConfig<T>, options?: MessageOptions) => Promise<T>
  dismiss: (id: string) => void
  clear: () => void
}

const DEFAULT_DURATION_BY_TYPE: Record<MessageType, number> = {
  error: 6000,
  success: 3500,
  response: 4500,
  info: 4000,
  loading: 0,
}

const MessageContext = createContext<MessageContextValue | null>(null)

let messageSequence = 0

function generateMessageId(): string {
  messageSequence += 1
  return `msg-${Date.now()}-${messageSequence}`
}

function resolveMessageText<T>(resolver: string | ((input: T) => string) | undefined, input: T, fallback = ""): string {
  if (typeof resolver === "function") return resolver(input)
  if (typeof resolver === "string") return resolver
  return fallback
}

export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<MessageItem[]>([])

  const dismiss = useCallback((id: string) => {
    setMessages((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clear = useCallback(() => {
    setMessages([])
  }, [])

  const notify = useCallback(
    (type: MessageType, text: string, options?: MessageOptions): string => {
      const id = generateMessageId()
      const duration = options?.duration ?? DEFAULT_DURATION_BY_TYPE[type]
      const newItem: MessageItem = {
        id,
        type,
        title: options?.title,
        text,
        duration,
        createdAt: Date.now(),
      }

      setMessages((prev) => [...prev, newItem])

      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration)
      }

      return id
    },
    [dismiss],
  )

  const error = useCallback(
    (text: string, title?: string, options?: MessageOptions) =>
      notify("error", text, { ...options, title: title ?? options?.title }),
    [notify],
  )

  const success = useCallback(
    (text: string, title?: string, options?: MessageOptions) =>
      notify("success", text, { ...options, title: title ?? options?.title }),
    [notify],
  )

  const response = useCallback(
    (text: string, title?: string, options?: MessageOptions) =>
      notify("response", text, { ...options, title: title ?? options?.title }),
    [notify],
  )

  const loading = useCallback(
    (text: string, title?: string, options?: MessageOptions) =>
      notify("loading", text, {
        ...options,
        title: title ?? options?.title,
        duration: options?.duration ?? 0,
      }),
    [notify],
  )

  const runAsync = useCallback(
    async <T,>(
      action: () => Promise<T>,
      asyncMessages: AsyncMessageConfig<T>,
      options?: MessageOptions,
    ): Promise<T> => {
      const loadingId = loading(asyncMessages.loading, options?.title, options)

      const eitherResult = await _Either.try.async(action)

      dismiss(loadingId)

      if (eitherResult.isLeft()) {
        const err = eitherResult.value
        const fallback = err instanceof Error ? err.message : String(err)
        const errorText = resolveMessageText(asyncMessages.error, err, fallback)
        if (errorText) error(errorText, options?.title, options)
        throw err
      }

      const result = eitherResult.value as T
      const successText = resolveMessageText(asyncMessages.success, result)
      if (successText) success(successText, options?.title, options)

      return result
    },
    [loading, dismiss, success, error],
  )

  const value = useMemo<MessageContextValue>(
    () => ({
      messages,
      notify,
      error,
      success,
      response,
      loading,
      runAsync,
      dismiss,
      clear,
    }),
    [messages, notify, error, success, response, loading, runAsync, dismiss, clear],
  )

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
}

export function useMessage(): MessageContextValue {
  const context = useContext(MessageContext)
  if (!context) {
    throw new Error("useMessage must be used within a MessageProvider")
  }
  return context
}
