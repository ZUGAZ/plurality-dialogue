import {
  cellCount,
  defaultLayoutId,
  maxCellCount,
  presetById,
  type LayoutId,
} from "@domain/layout/presets"
import {
  isProviderId,
  providerIds,
  type ProviderId,
} from "@domain/provider/provider-id"

export type { LayoutId }

export type PanelId = string

export type PanelSlot = {
  readonly id: PanelId
  readonly providerId: ProviderId | null
  readonly reloadGeneration: number
}

export type ProviderOption = {
  readonly id: ProviderId
  readonly label: string
}

export type PanelViewState = {
  readonly id: string
  readonly title: string
  readonly iconSrc?: string
  readonly embedUrl: string
  readonly src: string | undefined
  readonly hasLoaded: boolean
  readonly failed: boolean
  readonly errorDetail?: string
  readonly providerId: ProviderId | null
  readonly reloadGeneration: number
}

export const WORKSPACE_DEFAULT_SLOT_COUNT = cellCount(
  presetById(defaultLayoutId),
)

export const WORKSPACE_MIN_PANEL_COUNT = 1

export const WORKSPACE_MAX_PANEL_COUNT = maxCellCount

export const iframeSrc = (
  framingReady: boolean,
  embedUrl: string,
): string | undefined => (framingReady ? embedUrl : undefined)

export const isPanelLoading = (
  src: string | undefined,
  hasLoaded: boolean,
): boolean => src !== undefined && !hasLoaded

export const isHttpsIframeSrc = (
  src: string | undefined,
): src is string =>
  src !== undefined && src.startsWith("https://") && src !== "https://"

export type PanelFrameInputs = {
  readonly framingReady: boolean
  readonly failed: boolean
  readonly hasLoaded: boolean
  readonly errorDetail?: string
}

export const handshakeErrorText = (error: {
  readonly _tag: string
  readonly reason?: string
  readonly cause?: unknown
}): string => {
  if (error.reason !== undefined && error.reason.length > 0) {
    return error.reason
  }
  if (error.cause instanceof Error && error.cause.message.length > 0) {
    return `${error._tag}: ${error.cause.message}`
  }
  return error._tag
}

export const labelForProvider = (id: ProviderId): string => {
  switch (id) {
    case "chatgpt":
      return "ChatGPT"
    case "claude":
      return "Claude"
    case "gemini":
      return "Gemini"
  }
}

export const layoutTrackCounts = (
  layoutId: LayoutId,
): { readonly columns: number; readonly rows: number } => {
  const grid = presetById(layoutId)
  return { columns: grid.columnCount, rows: grid.rowCount }
}

export const decodeProviderId = (
  raw: string,
  enabledIds: readonly ProviderId[],
): ProviderId | null => {
  if (!isProviderId(raw)) {
    return null
  }
  return enabledIds.includes(raw) ? raw : null
}

export const selectOptions = (
  enabledIds: readonly ProviderId[],
): readonly ProviderOption[] => {
  const enabled = new Set(enabledIds)
  return providerIds
    .filter((id) => enabled.has(id))
    .map((id) => ({ id, label: labelForProvider(id) }))
}

export const isRefreshEnabled = (slot: PanelSlot): boolean =>
  slot.providerId !== null

export const toPanelViewState = (
  slot: PanelSlot,
  embedUrl: string | undefined,
  inputs: PanelFrameInputs,
): PanelViewState => {
  const providerId = slot.providerId
  return {
    id: slot.id,
    title: providerId === null ? "Panel" : labelForProvider(providerId),
    embedUrl: embedUrl ?? "",
    src:
      providerId === null || embedUrl === undefined
        ? undefined
        : iframeSrc(inputs.framingReady, embedUrl),
    hasLoaded: inputs.hasLoaded,
    failed: inputs.failed,
    errorDetail: inputs.failed ? inputs.errorDetail : undefined,
    providerId,
    reloadGeneration: slot.reloadGeneration,
  }
}
