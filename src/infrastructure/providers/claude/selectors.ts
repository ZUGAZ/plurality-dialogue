export const primaryComposerSelector = '.ProseMirror[role="textbox"]'

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector = 'button[aria-label="Send message"]'

export const primaryFileInputSelector =
  'input#chat-input-file-upload-onpage[type="file"]'

export const attachMenuSelector = 'button[data-testid="chat-input-attach"]'

export const primaryIncognitoSelector = 'button[aria-label="Use incognito"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  'button[aria-label="Send Message"]',
]

export const primaryAssistantReplySelector =
  '[data-testid="assistant-message"] .prose'

export const assistantReplySelectors: readonly string[] = [
  primaryAssistantReplySelector,
]

export const primaryStreamingIndicatorSelector =
  '[data-testid="assistant-message"][data-is-streaming="true"]'

export const streamingIndicatorSelectors: readonly string[] = [
  primaryStreamingIndicatorSelector,
  '[data-testid="chat-input-stop"]',
]
