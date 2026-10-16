import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachQwenGlobalImages } from "./attach-images"
import { openQwenGlobalTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryQwenGlobalComposer = (
  root: ParentNode,
): HTMLElement | null => firstDisplayed(root, composerSelectors)

export const queryQwenGlobalSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeQwenGlobalProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryQwenGlobalComposer(root),
    querySend: () => queryQwenGlobalSend(root),
  }),
  attachImages: attachQwenGlobalImages,
  openTemporaryChat: openQwenGlobalTemporaryChat,
})

export const qwenGlobalContentLayer = Layer.sync(ProviderPage, () =>
  makeQwenGlobalProviderPage(document),
)
