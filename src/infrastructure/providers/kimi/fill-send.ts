import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachKimiImages } from "./attach-images"
import { openKimiTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const queryKimiComposer = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, composerSelectors)

export const queryKimiSend = (root: ParentNode): HTMLElement | null =>
  firstDisplayed(root, sendSelectors)

export const makeKimiProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => queryKimiComposer(root),
    querySend: () => queryKimiSend(root),
  }),
  attachImages: attachKimiImages,
  openTemporaryChat: openKimiTemporaryChat,
})

export const kimiContentLayer = Layer.sync(ProviderPage, () =>
  makeKimiProviderPage(document),
)
