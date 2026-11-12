import { DEMO } from '../../lib/fixtures'
import type { LoginInput, Outcome } from '../../lib/types'

export type DemoStep = {
  id: string
  part: 1 | 2
  title: string
  goal: string
  narration: string
  kind: 'run' | 'patch' | 'suite'
  input?: LoginInput
  usernameLabel?: string
  passwordLabel?: string
  expect?: Outcome
}

export const PARTS: Record<1 | 2, string> = {
  1: 'Phần 1 · Lỗ hổng và cách tấn công',
  2: 'Phần 2 · Phòng thủ và tấn công lại',
}

export const STEPS: DemoStep[] = [
  {
    id: 'baseline-valid',
    part: 1,
    title: 'Đăng nhập hợp lệ',
    goal: 'Xác lập hành vi bình thường của SecureDesk khi backend nối chuỗi.',
    narration:
      'SecureDesk là cổng hỗ trợ nội bộ. Đăng nhập đúng tài khoản student01 thì vào được, đúng như mong đợi.',
    kind: 'run',
    input: {
      mode: 'vulnerable',
      username: DEMO.validUser,
      password: DEMO.validPassword,
      test_case_id: 'T01',
    },
    usernameLabel: DEMO.validUser,
    passwordLabel: 'mật khẩu đúng của student01',
    expect: 'AUTHENTICATED',
  },
  {
    id: 'baseline-wrong',
    part: 1,
    title: 'Sai mật khẩu bị từ chối',
    goal: 'Cho thấy điều kiện kiểm tra mật khẩu đang hoạt động.',
    narration:
      'Cùng tài khoản nhưng sai mật khẩu: PostgreSQL không trả về dòng nào nên đăng nhập thất bại.',
    kind: 'run',
    input: {
      mode: 'vulnerable',
      username: DEMO.validUser,
      password: DEMO.wrongPassword,
      test_case_id: 'T02',
    },
    usernameLabel: DEMO.validUser,
    passwordLabel: DEMO.wrongPassword,
    expect: 'DENIED',
  },
  {
    id: 'attack',
    part: 1,
    title: "Tấn công: admin' -- ",
    goal: 'Vượt qua đăng nhập tài khoản admin mà không biết mật khẩu.',
    narration:
      'Kẻ tấn công gõ admin\' --  vào ô tên đăng nhập. Dấu nháy đóng chuỗi SQL, "-- " biến phần kiểm tra mật khẩu thành chú thích. Mật khẩu vẫn sai, nhưng PostgreSQL vẫn trả về dòng admin.',
    kind: 'run',
    input: {
      mode: 'vulnerable',
      username: DEMO.payload,
      password: DEMO.wrongPassword,
      test_case_id: 'T03',
    },
    usernameLabel: DEMO.payload,
    passwordLabel: DEMO.wrongPassword,
    expect: 'AUTHENTICATED',
  },
  {
    id: 'patch',
    part: 2,
    title: 'Vá lỗi: tham số hóa truy vấn',
    goal: 'Thay nối chuỗi bằng bind tham số. Không đổi dữ liệu, không đổi điều kiện SQL.',
    narration:
      'Câu SQL trở thành hằng số với hai chỗ giữ %s. Psycopg gửi giá trị riêng, PostgreSQL không bao giờ phân tích chúng như mã SQL.',
    kind: 'patch',
  },
  {
    id: 'retest-attack',
    part: 2,
    title: 'Tấn công lại bằng cùng payload',
    goal: 'Cùng input, cùng dữ liệu; chỉ khác cách truyền giá trị.',
    narration:
      "Gửi lại đúng admin' --  với cùng mật khẩu sai. Lần này cả chuỗi được so sánh như một tên đăng nhập, không có tài khoản nào tên như vậy.",
    kind: 'run',
    input: {
      mode: 'secure',
      username: DEMO.payload,
      password: DEMO.wrongPassword,
      test_case_id: 'T03',
    },
    usernameLabel: DEMO.payload,
    passwordLabel: DEMO.wrongPassword,
    expect: 'DENIED',
  },
  {
    id: 'retest-valid',
    part: 2,
    title: 'Người dùng hợp lệ vẫn đăng nhập được',
    goal: 'Bản vá không làm hỏng chức năng.',
    narration:
      'Phòng thủ đúng không chặn người dùng thật: student01 với mật khẩu đúng vẫn vào được.',
    kind: 'run',
    input: {
      mode: 'secure',
      username: DEMO.validUser,
      password: DEMO.validPassword,
      test_case_id: 'T01',
    },
    usernameLabel: DEMO.validUser,
    passwordLabel: 'mật khẩu đúng của student01',
    expect: 'AUTHENTICATED',
  },
  {
    id: 'verify',
    part: 2,
    title: 'Kiểm chứng tự động',
    goal: 'Chạy bộ test T01–T08 trên cả hai chế độ và đối chiếu kỳ vọng.',
    narration:
      'Kết quả trên không phải ảnh chụp: bộ test chạy lại mọi trường hợp trên cùng dữ liệu, lưu run ID và đối chiếu với kỳ vọng.',
    kind: 'suite',
  },
]
