/**
 * Service Worker Registration
 * Handles PWA service worker registration and updates
 */

export const registerServiceWorker = async () => {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'activated' &&
          navigator.serviceWorker.controller
        ) {
          // Show update notification to user if needed
          notifyUserOfUpdate()
        }
      })
    })

    // Check for updates periodically
    setInterval(async () => {
      try {
        await registration.update()
      } catch (error) {
        if (error?.name === 'InvalidStateError') {
        } else {
          console.error('Service Worker update failed:', error)
        }
      }
    }, 60000) // Check every minute
  } catch (error) {
    console.error('Service Worker registration failed:', error)
  }
}

/**
 * Notify user about available app update
 */
const notifyUserOfUpdate = () => {
}

/**
 * Unregister service worker (useful for development)
 */
export const unregisterServiceWorker = async () => {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (let registration of registrations) {
      await registration.unregister()
    }
  } catch (error) {
    console.error('Error unregistering Service Worker:', error)
  }
}
