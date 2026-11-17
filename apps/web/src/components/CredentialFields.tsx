export function CredentialFields({
  username,
  password,
  onUsername,
  onPassword,
  idPrefix,
}: {
  username: string
  password: string
  onUsername: (value: string) => void
  onPassword: (value: string) => void
  idPrefix: string
}) {
  return (
    <div className="fields">
      <label className="field" htmlFor={`${idPrefix}-username`}>
        <span>Tên đăng nhập</span>
        <input
          id={`${idPrefix}-username`}
          className="mono"
          value={username}
          maxLength={128}
          required
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onUsername(event.target.value)}
        />
      </label>
      <label className="field" htmlFor={`${idPrefix}-password`}>
        <span>Mật khẩu</span>
        <input
          id={`${idPrefix}-password`}
          className="mono"
          type="password"
          value={password}
          maxLength={128}
          required
          autoComplete="off"
          onChange={(event) => onPassword(event.target.value)}
        />
      </label>
    </div>
  )
}
