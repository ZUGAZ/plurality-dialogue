import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachDeepseekImages } from "./attach-images"
import { openDeepseekTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryDeepseekComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryDeepseekSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeDeepseekProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryDeepseekComposer(root),
    querySend: () => queryDeepseekSend(root),
  }),
  attachImages: attachDeepseekImages,
  openTemporaryChat: openDeepseekTemporaryChat,
})

export const deepseekContentLayer = Layer.sync(ProviderPage, () =>
  makeDeepseekProviderPage(document),
)
