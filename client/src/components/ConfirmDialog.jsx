import { useEffect, useId, useRef } from 'react'

// Modal confirmation built on the native <dialog> element, which provides
// focus trapping, Escape-to-close and the backdrop.
// onCancel runs on Escape or a click on the backdrop.
export default function ConfirmDialog({ open, title, children, actions, onCancel }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault() // keep the dialog under React's control
        onCancel?.()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel?.() // click outside the panel
      }}
    >
      <div className="dialog-panel">
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </dialog>
  )
}
