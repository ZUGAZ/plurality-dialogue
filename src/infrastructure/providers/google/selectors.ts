export const primaryComposerSelector =
  '[data-active="input-plate-active"] textarea'

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector =
  '[data-active="input-plate-active"] [data-xid="input-plate-send-button"]'

export const sendSelectors: readonly string[] = [primarySendSelector]

export const primaryFileInputSelector =
  '[data-is-aim-input-menu="true"] input[type="file"][accept*="image/png"]'

export const uploadToolsSelector =
  '[data-active="input-plate-active"] button[aria-haspopup="menu"]'
