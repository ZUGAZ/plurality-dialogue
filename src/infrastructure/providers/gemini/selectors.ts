export const primaryComposerSelector = ".ql-editor"

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector = 'button[aria-label="Send message"]'

export const primaryFileInputSelector =
  'images-files-uploader input[name="Filedata"][type="file"]'

export const uploadToolsSelector = 'button[aria-label="Upload and tools"]'

export const primaryTemporaryChatSelector =
  'button[aria-label="Temporary chat"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  "button.send-button",
  '.input-area-container button:has(mat-icon[fonticon="arrow_upward"])',
  'button[aria-label="发送"]',
]

export const primaryAssistantReplySelector = "message-content .markdown"

export const assistantReplySelectors: readonly string[] = [
  primaryAssistantReplySelector,
]

export const primaryStreamingIndicatorSelector =
  'button[aria-label="Stop response"]'

export const streamingIndicatorSelectors: readonly string[] = [
  primaryStreamingIndicatorSelector,
  'mat-icon[data-mat-icon-name="stop"]',
]
