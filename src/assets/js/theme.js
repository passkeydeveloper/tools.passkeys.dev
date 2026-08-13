/*!
 * Color mode toggler for Bootstrap's docs (https://getbootstrap.com/)
 * Copyright 2011-2024 The Bootstrap Authors
 * Licensed under the Creative Commons Attribution 3.0 Unported License.
 */

(() => {
  'use strict'

  const getStoredTheme = () => localStorage.getItem('theme')
  const setStoredTheme = theme => {
    if (theme === 'auto') {
      localStorage.removeItem('theme')
    } else {
      localStorage.setItem('theme', theme)
    }
  }

  const getPreferredTheme = () => {
    const storedTheme = getStoredTheme()
    if (storedTheme) {
      return storedTheme
    }

    return 'auto'
  }

  const setTheme = theme => {
    if (theme === 'auto') {
      document.documentElement.setAttribute('data-bs-theme', (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
    } else {
      document.documentElement.setAttribute('data-bs-theme', theme)
    }
    updateUI(theme)
  }

  const updateUI = (theme) => {
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      if (btn.getAttribute('data-bs-theme-value') === theme) {
        btn.classList.add('active')
        btn.setAttribute('aria-pressed', 'true')
      } else {
        btn.classList.remove('active')
        btn.setAttribute('aria-pressed', 'false')
      }
    })
  }

  // Set initial theme
  setTheme(getPreferredTheme())

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const storedTheme = getStoredTheme()
    if (!storedTheme) {
      setTheme('auto')
    }
  })

  window.addEventListener('DOMContentLoaded', () => {
    updateUI(getPreferredTheme())

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-bs-theme-value')
        setStoredTheme(theme)
        setTheme(theme)
      })
    })
  })
})()
