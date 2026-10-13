export const primaryComposerSelector = '.ProseMirror[role="textbox"]'

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector = 'button[aria-label="Send message"]'

export const primaryFileInputSelector =
  'input#chat-input-file-upload-onpage[type="file"]'

export const primaryIncognitoSelector = 'button[aria-label="Use incognito"]'

export const sendSelectors: readonly string[] = [
  primarySendSelector,
  'button[aria-label="Send Message"]',
]
