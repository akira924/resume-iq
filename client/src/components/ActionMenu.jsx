import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const GAP = 4
const ITEM_HEIGHT = 36 // approx. height of one menu item, used to decide whether to open upward

// Three-dot button that opens a menu beside it.
// items: [{ action, label, danger? }]; onSelect(action) is called when one is clicked.
// The menu is rendered in a portal with fixed positioning so table scroll containers can't clip it.
export default function ActionMenu({ items, onSelect, label = 'Actions', disabled = false }) {
  const [position, setPosition] = useState(null) // null = closed
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const open = position !== null

  const close = useCallback((restoreFocus = false) => {
    setPosition(null)
    if (restoreFocus) buttonRef.current?.focus()
  }, [])

  function openMenu() {
    const rect = buttonRef.current.getBoundingClientRect()
    const viewport = document.documentElement
    const menuHeight = items.length * ITEM_HEIGHT + 8
    const fitsBelow = viewport.clientHeight - rect.top >= menuHeight
    setPosition({
      // Sit immediately to the left of the button…
      right: viewport.clientWidth - rect.left + GAP,
      // …aligned with its top, or with its bottom when there's no room below.
      ...(fitsBelow ? { top: rect.top } : { bottom: viewport.clientHeight - rect.bottom }),
    })
  }

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector('[role="menuitem"]')?.focus()

    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close()
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close(true)
    }
    // The menu is fixed-positioned, so close it rather than let it drift from its button.
    const onScrollOrResize = () => close()

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, close])

  function onMenuKeyDown(e) {
    const entries = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
    const index = entries.indexOf(document.activeElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      entries[(index + step + entries.length) % entries.length]?.focus()
    } else if (e.key === 'Tab') {
      close()
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button"
        aria-label={label}
        title={disabled ? 'No actions available' : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            className="menu"
            style={position}
            onKeyDown={onMenuKeyDown}
          >
            {items.map((item) => (
              <button
                key={item.action}
                type="button"
                role="menuitem"
                className={`menu-item${item.danger ? ' is-danger' : ''}`}
                onClick={() => {
                  close(true)
                  onSelect(item.action)
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
