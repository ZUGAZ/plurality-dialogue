import { Layer } from "effect"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachClaudeImages } from "./attach-images"
import { makeClaudeCaptureReply } from "./capture-reply"
import { openClaudeTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryClaudeComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryClaudeSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeClaudeProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryClaudeComposer(root),
    querySend: () => queryClaudeSend(root),
  }),
  attachImages: (images: ReadonlyArray<PendingImage>) =>
    attachClaudeImages(root, images),
  openTemporaryChat: () => openClaudeTemporaryChat(root),
  captureReply: makeClaudeCaptureReply(root),
})

export const claudeContentLayer = Layer.sync(ProviderPage, () =>
  makeClaudeProviderPage(document),
)
