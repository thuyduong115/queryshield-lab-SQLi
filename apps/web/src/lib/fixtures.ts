// Public, disposable classroom fixtures (docs/03-DATA-MODEL.md). Never real credentials.
export const DEMO = {
  validUser: 'student01',
  validPassword: 'StudentDemo123!',
  wrongPassword: 'wrong-password',
  payload: "admin' -- ",
} as const

export type Preset = {
  id: string
  label: string
  username: string
  password: string
}

export const PRESETS: Preset[] = [
  {
    id: 'T01',
    label: 'T01 · Đăng nhập hợp lệ',
    username: DEMO.validUser,
    password: DEMO.validPassword,
  },
  {
    id: 'T02',
    label: 'T02 · Sai mật khẩu',
    username: DEMO.validUser,
    password: DEMO.wrongPassword,
  },
  {
    id: 'T03',
    label: "T03 · Payload admin' -- ",
    username: DEMO.payload,
    password: DEMO.wrongPassword,
  },
  {
    id: 'T04',
    label: 'T04 · Người dùng không tồn tại',
    username: 'ghost_user',
    password: 'AnyPassword1!',
  },
  {
    id: 'T05',
    label: "T05 · Tên có dấu nháy O'Connor",
    username: "O'Connor",
    password: 'Random-Pass-1',
  },
  {
    id: 'T06',
    label: 'T06 · Tên Unicode',
    username: 'nguyễn.văn.an',
    password: DEMO.wrongPassword,
  },
]
