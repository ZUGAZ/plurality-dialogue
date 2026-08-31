export const fillLabel = "Fill"
export const sendAllLabel = "Send All"
export const clearLabel = "Clear"
export const promptLabel = "Prompt"
export const messagePlaceholder = "Message"

export const isDraftEmpty = (text: string): boolean => text.trim().length === 0

export type BarStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "notice"; readonly text: string }

export const statusText = (status: BarStatus): string => {
  if (status.kind === "notice") {
    return status.text
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

export const failureLine = (
  items: ReadonlyArray<{
    readonly panelId: string
    readonly label: string
  }>,
): string => {
  if (items.length === 0) {
    return ""
  }
  return `Failed: ${items.map((item) => `${item.panelId} (${item.label})`).join(", ")}`
}
