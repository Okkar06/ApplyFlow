/* global localStorage, window, document */

(function () {
  var stored = null
  try {
    stored = localStorage.getItem('jobtrail-theme')
  } catch {
    // storage blocked (privacy settings): fall back to the system theme
  }
  var system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  var theme = stored === 'light' || stored === 'dark' ? stored : system
  document.documentElement.dataset.theme = theme
})()
