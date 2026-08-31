export const primaryComposerSelector = "#prompt-textarea"

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector = 'button[data-testid="send-button"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  'button[aria-label="Send prompt"]',
  'button[data-testid="fruitjuice-send-button"]',
]
