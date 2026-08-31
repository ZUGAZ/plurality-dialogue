import type { Provider } from "@domain/provider/provider"

export type PanelViewState = {
  readonly id: string
  readonly title: string
  readonly iconSrc?: string
  readonly embedUrl: string
  readonly src: string | undefined
  readonly hasLoaded: boolean
  readonly failed: boolean
}

export const panelIdAt = (index: number): string => `panel-${index + 1}`

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
}

export const toPanelViewState = (
  provider: Provider,
  index: number,
  inputs: PanelFrameInputs,
): PanelViewState => {
  const id = panelIdAt(index)
  return {
    id,
    title: provider.displayName,
    embedUrl: provider.url,
    src: iframeSrc(inputs.framingReady, provider.url),
    hasLoaded: inputs.hasLoaded,
    failed: inputs.failed,
  }
}
