export const primaryComposerSelector = ".query-bar-editor"

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector = 'button[data-testid="chat-submit"]'

export const primaryFileInputSelector = 'input[name="files"][type="file"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  'button[aria-label="Submit"]',
]
