import type { ProviderId } from "@domain/provider/provider-id"
import { builtInProviders } from "@domain/provider/built-in-providers"
import { iframeSrc, labelForProvider } from "../../panel-grid/model"

export type EngineMount = {
  readonly panelId: string
  readonly providerId: ProviderId
  readonly reloadGeneration: number
}

export type EngineStripItem = {
  readonly panelId: string
  readonly providerId: ProviderId
  readonly title: string
  readonly embedUrl: string
  readonly src: string | undefined
  readonly hasLoaded: boolean
  readonly failed: boolean
  readonly reloadGeneration: number
  readonly mountKey: string
}

export const toEngineStripItem = (
  row: EngineMount,
  framingReady: boolean,
  hasLoaded: boolean,
): EngineStripItem => {
  const embedUrl = embedUrlForProvider(row.providerId)
  return {
    panelId: row.panelId,
    providerId: row.providerId,
    title: labelForProvider(row.providerId),
    embedUrl,
    src: iframeSrc(framingReady, embedUrl),
    hasLoaded,
    failed: false,
    reloadGeneration: row.reloadGeneration,
    mountKey: `${row.panelId}:${row.providerId}:${row.reloadGeneration}`,
  }
}

const embedUrlForProvider = (providerId: ProviderId): string => {
  const match = builtInProviders.find((provider) => provider.id === providerId)
  return match === undefined ? "" : match.url
}
