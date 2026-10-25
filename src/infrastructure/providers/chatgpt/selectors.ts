export const primaryComposerSelector =
  'form[data-chatgpt-composer] [data-composer-markdown][contenteditable="true"]'

export const composerSelectors: readonly string[] = [
  primaryComposerSelector,
  "#prompt-textarea",
]

export const primarySendSelector = 'button[data-testid="send-button"]'

export const primaryFileInputSelector = 'input#upload-files[type="file"]'

export const composerPlusSelector = "button#composer-plus-btn"

export const primaryTemporaryChatSelector =
  'button[aria-label="Temporary chat"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  "#composer-submit-button",
  'button[aria-label="Send prompt"]',
  'button[aria-label="Send message"]',
  'button[aria-label="Send"]',
  'button[data-testid="fruitjuice-send-button"]',
]

export const primaryAssistantReplySelector =
  '[data-message-role="assistant"] [data-assistant-markdown]'

export const assistantReplySelectors: readonly string[] = [
  primaryAssistantReplySelector,
]

export const primaryStreamingIndicatorSelector = "[data-message-streaming]"

export const streamingIndicatorSelectors: readonly string[] = [
  primaryStreamingIndicatorSelector,
  "[data-streaming-dot]",
  "[data-stop-generating]",
]
