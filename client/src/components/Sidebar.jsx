// Left sidebar with a list of selectable items.
// items: [{ id, label }]; selectedId: id of the active item (or null).
// footer: optional content pinned to the bottom of the sidebar.
export default function Sidebar({ items, selectedId = null, onSelect, footer }) {
  return (
    <aside className="sidebar">
      <ul className="sidebar-list">
        {items.map((item) => {
          const selected = item.id === selectedId
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`sidebar-item${selected ? ' is-selected' : ''}`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(item.id)}
              >
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
      {footer && <div className="sidebar-footer">{footer}</div>}
    </aside>
  )
}
