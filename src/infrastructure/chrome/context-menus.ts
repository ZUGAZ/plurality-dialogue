import {
  contextMenuContexts,
  contextMenuDocumentUrlPatterns,
  sendToPluralityDialogueMenuId,
  sendToPluralityDialogueMenuTitle,
  type ContextMenuDraftSource,
} from "../../domain/workspace/context-menu-draft"

export const registerSendToPluralityDialogueMenu = (
  onSend: (source: ContextMenuDraftSource) => void,
): void => {
  // The click listener has to be attached during service-worker startup.
  // removeAll finishes later; the item is created in that callback.
  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== sendToPluralityDialogueMenuId) {
      return
    }
    onSend({
      selectionText: info.selectionText,
      linkUrl: info.linkUrl,
      pageUrl: info.pageUrl,
    })
  })
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: sendToPluralityDialogueMenuId,
      title: sendToPluralityDialogueMenuTitle,
      contexts: [...contextMenuContexts],
      documentUrlPatterns: [...contextMenuDocumentUrlPatterns],
    })
  })
}
