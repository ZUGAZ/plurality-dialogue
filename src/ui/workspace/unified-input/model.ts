import {
  maxImageBytes,
  maxPendingImages,
  pendingImageMediaTypes,
  type ImageRejection,
} from "@domain/broadcast/pending-image"
import { isPanelFailed } from "@domain/broadcast/panel-failed"
import type { PanelResult } from "@domain/broadcast/panel-result"
import type { VisiblePanel } from "@domain/broadcast/resolve-targets"

export { pendingImageMediaTypes }

export const fillLabel = "Fill"
export const sendAllLabel = "Send All"
export const clearLabel = "Clear"
export const retryLabel = "Retry Failed"
export const promptLabel = "Prompt"
export const messagePlaceholder = "Message"
export const attachImagesLabel = "Images"
export const attachedImagesLabel = "Attached images"
export const removeImageLabel = "Remove"

export type LastBroadcast = {
  readonly kind: "fill" | "send"
  readonly prompt: string
  readonly failedPanels: ReadonlyArray<VisiblePanel>
}

export const isDraftEmpty = (text: string): boolean => text.trim().length === 0

export const imageDisplayName = (name: string): string => {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return "image"
  }
  return trimmed
}

export const canClearBar = (text: string, imageCount: number): boolean =>
  !isDraftEmpty(text) || imageCount > 0

export type BarStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "notice"; readonly text: string }

export const statusText = (status: BarStatus): string => {
  if (status.kind === "notice") {
    return status.text
  }
  return ""
}

export type ImagePreview = {
  readonly id: string
  readonly name: string
  readonly previewUrl: string
}

export const imageRejectionText = (rejection: ImageRejection): string => {
  switch (rejection._tag) {
    case "UnsupportedImageType":
      return "Only PNG, JPEG, WebP, and GIF images can be attached."
    case "ImageEmpty":
      return "That image is empty."
    case "ImageTooLarge":
      return `Each image must be ${maxImageBytes / (1024 * 1024)} MB or smaller.`
    case "TooManyImages":
      return `Only ${maxPendingImages} images can be attached.`
    case "ImageUnreadable":
      return "That image could not be read."
  }
}

const imageRejections: readonly ImageRejection[] = [
  { _tag: "UnsupportedImageType" },
  { _tag: "ImageEmpty" },
  { _tag: "ImageTooLarge" },
  { _tag: "TooManyImages" },
  { _tag: "ImageUnreadable" },
]

const imageNoticeTexts: ReadonlySet<string> = new Set(
  imageRejections.map((rejection) => imageRejectionText(rejection)),
)

export const isImageNotice = (status: BarStatus): boolean => {
  if (status.kind !== "notice") {
    return false
  }
  return imageNoticeTexts.has(status.text)
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
