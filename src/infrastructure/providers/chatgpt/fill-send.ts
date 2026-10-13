import { Layer } from "effect"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachChatgptImages } from "./attach-images"
import { composerSelectors, sendSelectors } from "./selectors"

export const makeChatgptProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => firstDisplayed(root, composerSelectors),
    querySend: () => firstDisplayed(root, sendSelectors),
  }),
  attachImages: (images: ReadonlyArray<PendingImage>) =>
    attachChatgptImages(root, images),
})

export const chatgptContentLayer = Layer.sync(ProviderPage, () =>
  makeChatgptProviderPage(document),
)
