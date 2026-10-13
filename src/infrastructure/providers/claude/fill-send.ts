import { Layer } from "effect"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { attachClaudeImages } from "./attach-images"
import { composerSelectors, sendSelectors } from "./selectors"

export const makeClaudeProviderPage = (root: ParentNode) => ({
  ...makeFillSendPage({
    queryComposer: () => firstDisplayed(root, composerSelectors),
    querySend: () => firstDisplayed(root, sendSelectors),
  }),
  attachImages: (images: ReadonlyArray<PendingImage>) =>
    attachClaudeImages(root, images),
})

export const claudeContentLayer = Layer.sync(ProviderPage, () =>
  makeClaudeProviderPage(document),
)
