// Labelled form controls with an inline error message.
// `id` is required so the label, input and error text are linked for screen readers.

function Wrapper({ id, label, required, error, hint, children }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      ) : (
        hint && <span className="field-hint">{hint}</span>
      )}
    </div>
  )
}

export function Field({ id, label, required, error, hint, ...inputProps }) {
  return (
    <Wrapper id={id} label={label} required={required} error={error} hint={hint}>
      <input
        id={id}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
    </Wrapper>
  )
}

export function SelectField({ id, label, required, error, hint, options, placeholder, ...selectProps }) {
  return (
    <Wrapper id={id} label={label} required={required} error={error} hint={hint}>
      <select
        id={id}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...selectProps}
      >
        <option value="">{placeholder ?? 'Select…'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  )
}
