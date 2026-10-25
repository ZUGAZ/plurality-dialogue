export const primaryComposerSelector = ".query-bar-editor"

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector = 'button[data-testid="chat-submit"]'

export const primaryFileInputSelector = 'input[name="files"][type="file"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  'button[aria-label="Submit"]',
]

export const primaryAssistantReplySelector =
  '[data-testid="assistant-message"] .response-content-markdown'

export const assistantReplySelectors: readonly string[] = [
  primaryAssistantReplySelector,
]

export const primaryStreamingIndicatorSelector =
  'button[aria-label="Stop model response"]'

export const streamingIndicatorSelectors: readonly string[] = [
  primaryStreamingIndicatorSelector,
  '[data-state="working"]',
]
