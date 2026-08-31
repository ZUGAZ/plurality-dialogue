export const primaryComposerSelector = ".ql-editor"

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector = 'button[aria-label="Send message"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  "button.send-button",
  '.input-area-container button:has(mat-icon[fonticon="arrow_upward"])',
  'button[aria-label="发送"]',
]
