export const primaryComposerSelector =
  'form[data-chatgpt-composer] [data-composer-markdown][contenteditable="true"]'

export const composerSelectors: readonly string[] = [
  primaryComposerSelector,
  "#prompt-textarea",
]

export const primarySendSelector = 'button[data-testid="send-button"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  "#composer-submit-button",
  'button[aria-label="Send prompt"]',
  'button[aria-label="Send message"]',
  'button[aria-label="Send"]',
  'button[data-testid="fruitjuice-send-button"]',
]
