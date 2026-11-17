import type { Mode, Outcome } from './types'

export const MODE_LABEL: Record<Mode, string> = {
  vulnerable: 'Dễ bị tấn công',
  secure: 'Tham số hóa',
}

export const MODE_HINT: Record<Mode, string> = {
  vulnerable: 'Nối chuỗi input vào câu SQL',
  secure: 'Bind tham số bằng Psycopg',
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  AUTHENTICATED: 'Đăng nhập thành công',
  DENIED: 'Bị từ chối',
  QUERY_ERROR: 'Câu SQL bị lỗi cú pháp',
  LAB_DISABLED: 'Lab không an toàn đang tắt',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  REJECTED_BY_VALIDATION: 'Bị allow-list chặn trước khi tới CSDL',
}

export const OUTCOME_SHORT: Record<Outcome, string> = {
  AUTHENTICATED: 'Thành công',
  DENIED: 'Từ chối',
  QUERY_ERROR: 'Lỗi SQL',
  LAB_DISABLED: 'Đã tắt',
  VALIDATION_ERROR: '422',
  REJECTED_BY_VALIDATION: 'Allow-list chặn',
}

export const OBSERVATION_TEXT: Record<string, string> = {
  INPUT_ESCAPED_STRING_LITERAL:
    'Dấu nháy trong input đã đóng chuỗi SQL sớm: phần còn lại của input trở thành mã SQL.',
  INPUT_STARTED_COMMENT:
    'Input chứa "-- " nên PostgreSQL coi mọi thứ phía sau là chú thích.',
  PASSWORD_CHECK_COMMENTED_OUT:
    'Điều kiện kiểm tra mật khẩu password = ... nằm trong chú thích, không được thực thi.',
  INPUT_STAYED_INSIDE_LITERAL:
    'Input nằm trọn trong chuỗi SQL; lần này nó không thay đổi cấu trúc câu truy vấn.',
  REJECTED_BEFORE_DATABASE:
    'Lớp allow-list (L2) từ chối tên đăng nhập. Không có câu SQL nào được dựng hay gửi tới PostgreSQL.',
  VALUES_SENT_SEPARATELY:
    'Câu SQL là hằng số. Giá trị được gửi riêng ($1, $2) nên PostgreSQL chỉ so sánh chúng như dữ liệu.',
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị',
  staff: 'Nhân viên',
  student: 'Sinh viên',
}

export const LAYER_LABEL: Record<string, string> = {
  binding: 'L1 Bind tham số',
  validation: 'L2 Allow-list',
  error_masking: 'L4 Che lỗi',
  monitoring: 'L5 Giám sát',
}

export const ALERT_LABEL: Record<string, string> = {
  QUOTE: 'dấu nháy',
  COMMENT: 'chú thích SQL',
  SEPARATOR: 'dấu chấm phẩy',
}
