export const setAppBadge = async (count) => {
  try {
    if ('setAppBadge' in navigator) {
      await navigator.setAppBadge(count)
    }
  } catch (error) {
  }
}

export const clearAppBadge = async () => {
  try {
    if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge()
    }
  } catch (error) {
  }
}
