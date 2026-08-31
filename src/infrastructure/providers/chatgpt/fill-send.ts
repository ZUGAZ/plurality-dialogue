import { Layer } from "effect"
import { ProviderPage } from "../../../domain/ports/provider-page"
import { firstDisplayed } from "../displayed-element"
import { makeFillSendPage } from "../make-fill-send-page"
import { composerSelectors, sendSelectors } from "./selectors"

export const makeChatgptProviderPage = (root: ParentNode) =>
  makeFillSendPage({
    queryComposer: () => firstDisplayed(root, composerSelectors),
    querySend: () => firstDisplayed(root, sendSelectors),
  })

export const chatgptContentLayer = Layer.sync(ProviderPage, () =>
  makeChatgptProviderPage(document),
)
