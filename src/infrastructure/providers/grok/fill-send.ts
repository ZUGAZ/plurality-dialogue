import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachGrokImages } from "./attach-images"
import { openGrokTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryGrokComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryGrokSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeGrokProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryGrokComposer(root),
    querySend: () => queryGrokSend(root),
  }),
  attachImages: attachGrokImages,
  openTemporaryChat: openGrokTemporaryChat,
})

export const grokContentLayer = Layer.sync(ProviderPage, () =>
  makeGrokProviderPage(document),
)
