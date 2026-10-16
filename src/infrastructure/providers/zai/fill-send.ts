import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachZaiImages } from "./attach-images"
import { openZaiTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryZaiComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryZaiSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeZaiProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryZaiComposer(root),
    querySend: () => queryZaiSend(root),
  }),
  attachImages: attachZaiImages,
  openTemporaryChat: openZaiTemporaryChat,
})

export const zaiContentLayer = Layer.sync(ProviderPage, () =>
  makeZaiProviderPage(document),
)
