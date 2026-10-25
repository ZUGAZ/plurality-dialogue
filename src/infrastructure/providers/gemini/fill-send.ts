import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachGeminiImages } from "./attach-images"
import { makeGeminiCaptureReply } from "./capture-reply"
import { openGeminiTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryGeminiComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryGeminiSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeGeminiProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryGeminiComposer(root),
    querySend: () => queryGeminiSend(root),
  }),
  attachImages: attachGeminiImages,
  openTemporaryChat: openGeminiTemporaryChat,
  captureReply: makeGeminiCaptureReply(root),
})

export const geminiContentLayer = Layer.sync(ProviderPage, () =>
  makeGeminiProviderPage(document),
)
