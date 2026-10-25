import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachGoogleImages } from "./attach-images"
import { openGoogleTemporaryChat } from "./open-temporary-chat"
import { unsupportedCaptureReply } from "../unsupported-capture-reply"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryGoogleComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryGoogleSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeGoogleProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryGoogleComposer(root),
    querySend: () => queryGoogleSend(root),
  }),
  attachImages: attachGoogleImages,
  openTemporaryChat: openGoogleTemporaryChat,
  captureReply: unsupportedCaptureReply,
})

export const googleContentLayer = Layer.sync(ProviderPage, () =>
  makeGoogleProviderPage(document),
)
