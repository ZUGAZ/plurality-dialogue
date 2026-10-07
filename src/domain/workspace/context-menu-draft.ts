import { Option, pipe } from "effect"

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

// pageUrl is part of the click and does not change the draft. A later step
// can wrap this function and decide where that URL goes.
export const draftTextFromContextMenu = (
  source: ContextMenuDraftSource,
): Option.Option<string> =>
  pipe(
    trimmedNonEmpty(source.selectionText),
    Option.orElse(() => trimmedNonEmpty(source.linkUrl)),
  )
