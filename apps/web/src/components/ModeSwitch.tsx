import { MODE_HINT, MODE_LABEL } from '../lib/labels'
import type { Mode } from '../lib/types'

export function ModeSwitch({
  value,
  onChange,
  unsafeEnabled,
}: {
  value: Mode
  onChange: (mode: Mode) => void
  unsafeEnabled: boolean | null
}) {
  return (
    <fieldset className="mode-switch">
      <legend>Chế độ backend</legend>
      {(['vulnerable', 'secure'] as const).map((mode) => (
        <label key={mode} className={`mode-option mode-option--${mode}`}>
          <input
            type="radio"
            name="mode"
            value={mode}
            checked={value === mode}
            onChange={() => onChange(mode)}
          />
          <span className="mode-option__label">{MODE_LABEL[mode]}</span>
          <span className="mode-option__hint">
            {mode === 'vulnerable' && unsafeEnabled === false
              ? 'Đang tắt bởi cấu hình'
              : MODE_HINT[mode]}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
