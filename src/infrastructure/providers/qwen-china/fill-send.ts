import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachQwenChinaImages } from "./attach-images"
import { openQwenChinaTemporaryChat } from "./open-temporary-chat"
import { unsupportedCaptureReply } from "../unsupported-capture-reply"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryQwenChinaComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryQwenChinaSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeQwenChinaProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryQwenChinaComposer(root),
    querySend: () => queryQwenChinaSend(root),
  }),
  attachImages: attachQwenChinaImages,
  openTemporaryChat: openQwenChinaTemporaryChat,
  captureReply: unsupportedCaptureReply,
})

export const qwenChinaContentLayer = Layer.sync(ProviderPage, () =>
  makeQwenChinaProviderPage(document),
)
