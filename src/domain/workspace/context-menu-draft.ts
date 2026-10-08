import { Option, pipe } from "effect"
import type { SourceUrlPlacement } from "../settings/source-url-placement"

export const sendToPluralityDialogueMenuId = "send-to-plurality-dialogue"

export const sendToPluralityDialogueMenuTitle = "Send to Plurality Dialogue"

export const contextMenuContexts: readonly ["page", "selection", "link"] = [
  "page",
  "selection",
  "link",
]

export const contextMenuDocumentUrlPatterns: readonly [
  "http://*/*",
  "https://*/*",
] = ["http://*/*", "https://*/*"]

export type ContextMenuDraftSource = {
  readonly selectionText: string | undefined
  readonly linkUrl: string | undefined
  readonly pageUrl: string | undefined
}

const trimmedNonEmpty = (text: string | undefined): Option.Option<string> =>
  pipe(
    Option.fromNullable(text),
    Option.map((value) => value.trim()),
    Option.filter((value) => value.length > 0),
  )

const textWithSource = (
  placement: Exclude<SourceUrlPlacement, "omit">,
  pageUrl: string,
  text: string,
): string => {
  const formatted: {
    readonly [Placement in Exclude<SourceUrlPlacement, "omit">]: string
  } = {
    before: `Source: ${pageUrl}\n\n${text}`,
    after: `${text}\n\nSource: ${pageUrl}`,
  }
  return formatted[placement]
}

const placedText = (
  text: string,
  pageUrl: string | undefined,
  placement: SourceUrlPlacement,
): string => {
  if (placement === "omit") {
    return text
  }
  return pipe(
    trimmedNonEmpty(pageUrl),
    Option.match({
      onNone: () => text,
      onSome: (url) => textWithSource(placement, url, text),
    }),
  )
}

export const draftTextFromContextMenu = ({
  selectionText,
  linkUrl,
  pageUrl,
  placement,
}: {
  readonly selectionText: string | undefined
  readonly linkUrl: string | undefined
  readonly pageUrl: string | undefined
  readonly placement: SourceUrlPlacement
}): Option.Option<string> =>
  pipe(
    trimmedNonEmpty(selectionText),
    Option.orElse(() => trimmedNonEmpty(linkUrl)),
    Option.map((text) => placedText(text, pageUrl, placement)),
  )
