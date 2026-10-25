import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachDoubaoImages } from "./attach-images"
import { openDoubaoTemporaryChat } from "./open-temporary-chat"
import { unsupportedCaptureReply } from "../unsupported-capture-reply"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryDoubaoComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryDoubaoSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeDoubaoProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryDoubaoComposer(root),
    querySend: () => queryDoubaoSend(root),
  }),
  attachImages: attachDoubaoImages,
  openTemporaryChat: openDoubaoTemporaryChat,
  captureReply: unsupportedCaptureReply,
})

export const doubaoContentLayer = Layer.sync(ProviderPage, () =>
  makeDoubaoProviderPage(document),
)
