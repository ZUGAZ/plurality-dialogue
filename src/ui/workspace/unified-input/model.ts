import { isPanelFailed } from "@domain/broadcast/panel-failed"
import type { PanelResult } from "@domain/broadcast/panel-result"
import type { VisiblePanel } from "@domain/broadcast/resolve-targets"

export const fillLabel = "Fill"
export const sendAllLabel = "Send All"
export const clearLabel = "Clear"
export const retryLabel = "Retry Failed"
export const promptLabel = "Prompt"
export const messagePlaceholder = "Message"

export type LastBroadcast = {
  readonly kind: "fill" | "send"
  readonly prompt: string
  readonly failedPanels: ReadonlyArray<VisiblePanel>
}

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

export const failedPanelsFromResults = (
  results: ReadonlyArray<PanelResult>,
): ReadonlyArray<VisiblePanel> =>
  results.filter(isPanelFailed).map((failed) => ({
    panelId: failed.panelId,
    providerId: failed.providerId,
  }))
