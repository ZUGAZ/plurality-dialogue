export const fillLabel = "Fill"
export const sendAllLabel = "Send All"
export const clearLabel = "Clear"
export const promptLabel = "Prompt"
export const messagePlaceholder = "Message"

export const isDraftEmpty = (text: string): boolean => text.trim().length === 0

export type BarStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "fill-not-wired" }
  | { readonly kind: "send-not-wired" }

export const statusText = (status: BarStatus): string => {
  if (status.kind === "fill-not-wired") {
    return "Fill isn't connected yet."
  }
  if (status.kind === "send-not-wired") {
    return "Send All isn't connected yet."
  }
  return ""
}

export const draftAfterFillOrSend = (
  kind: "fill" | "send",
  currentDraft: string,
  outcome: "failed" | "succeeded",
): string => {
  if (outcome === "succeeded" && kind === "send") {
    return ""
  }
  return currentDraft
}
