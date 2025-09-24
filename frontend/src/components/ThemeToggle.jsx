import { useEffect, useState } from 'react'

const THEME_KEY = 'theme'
const THEMES = ['dark', 'corporate']

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved && THEMES.includes(saved)) return saved
    } catch {}
    return 'dark'
  })

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {}
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = () => {
    setTheme(curr => (curr === 'dark' ? 'corporate' : 'dark'))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        type="button"
        className="btn btn-primary btn-circle shadow-lg"
        onClick={toggle}
        aria-label="Toggle theme"
        title={`Switch to ${theme === 'dark' ? 'corporate' : 'dark'} theme`}
      >
        {theme === 'dark' ? (
          <span className="text-xs font-semibold">Corp</span>
        ) : (
          <span className="text-xs font-semibold">Dark</span>
        )}
      </button>
    </div>
  )
}