import { Layer } from "effect"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachChatgptImages } from "./attach-images"
import { makeChatgptCaptureReply } from "./capture-reply"
import { openChatgptTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryChatgptComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryChatgptSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeChatgptProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryChatgptComposer(root),
    querySend: () => queryChatgptSend(root),
  }),
  attachImages: (images: ReadonlyArray<PendingImage>) =>
    attachChatgptImages(root, images),
  openTemporaryChat: () => openChatgptTemporaryChat(root),
  captureReply: makeChatgptCaptureReply(root),
})

export const chatgptContentLayer = Layer.sync(ProviderPage, () =>
  makeChatgptProviderPage(document),
)
