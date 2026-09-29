export const chromeErrorMessage = (
  cause: unknown,
  fallback: string,
): string => {
  if (typeof cause === "string" && cause.length > 0) {
    return cause
  }
  if (cause instanceof Error && cause.message.length > 0) {
    return cause.message
  }
  if (typeof cause === "object" && cause !== null && "message" in cause) {
    const message = Reflect.get(cause, "message")
    if (typeof message === "string" && message.length > 0) {
      return message
    }
  }
  return fallback
}
