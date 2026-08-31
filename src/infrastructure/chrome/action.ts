export const subscribeActionClicked = (onClicked: () => void): void => {
  chrome.action.onClicked.addListener(() => {
    onClicked()
  })
}
