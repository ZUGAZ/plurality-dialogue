export const primaryComposerSelector = "textarea.message-input-textarea"

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector = "button.send-button"

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  'button[aria-label="Send"]',
]

export const primaryFileInputSelector = "input#filesUpload"
