/* global localStorage, window, document */

(function () {
  var stored = localStorage.getItem('jobtrail-theme')
  var system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  var theme = stored === 'light' || stored === 'dark' ? stored : system
  document.documentElement.dataset.theme = theme
})()
