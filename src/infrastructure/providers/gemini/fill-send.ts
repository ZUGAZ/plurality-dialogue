import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachGeminiImages } from "./attach-images"
import { openGeminiTemporaryChat } from "./open-temporary-chat"
import { composerSelectors, sendSelectors } from "./selectors"

export const makeGeminiProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => firstDisplayed(root, composerSelectors),
    querySend: () => firstDisplayed(root, sendSelectors),
  }),
  attachImages: attachGeminiImages,
  openTemporaryChat: openGeminiTemporaryChat,
})

export const geminiContentLayer = Layer.sync(ProviderPage, () =>
  makeGeminiProviderPage(document),
)
