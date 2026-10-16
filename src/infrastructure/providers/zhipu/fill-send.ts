import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachZhipuImages } from "./attach-images"
import { openZhipuTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryZhipuComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryZhipuSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeZhipuProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryZhipuComposer(root),
    querySend: () => queryZhipuSend(root),
  }),
  attachImages: attachZhipuImages,
  openTemporaryChat: openZhipuTemporaryChat,
})

export const zhipuContentLayer = Layer.sync(ProviderPage, () =>
  makeZhipuProviderPage(document),
)
