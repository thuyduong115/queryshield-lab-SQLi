import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

import { DEMO } from '../../lib/fixtures'

export function OverviewPage() {
  return (
    <section className="page overview">
      <header className="overview__head">
        <h1>Dữ liệu phải nằm ngoài mã SQL</h1>
        <p className="lead">
          QueryShield Lab tái hiện một lỗi SQL Injection thật trên SecureDesk,
          cổng hỗ trợ nội bộ giả lập, rồi chứng minh bản vá bằng chính input tấn
          công đó, trên cùng dữ liệu PostgreSQL.
        </p>
        <Link className="button button--primary" to="/demo">
          Bắt đầu kịch bản demo <ArrowRight size={20} aria-hidden />
        </Link>
      </header>

      <div className="overview__parts">
        <article className="part-card part-card--1">
          <h2>Phần 1 · Lỗ hổng và cách tấn công</h2>
          <p>
            Backend nối input vào câu SQL. Payload{' '}
            <code className="input-chip">{DEMO.payload}</code> đóng chuỗi và
            biến điều kiện mật khẩu thành chú thích: đăng nhập vào{' '}
            <code>admin</code> với mật khẩu sai.
          </p>
        </article>
        <article className="part-card part-card--2">
          <h2>Phần 2 · Phòng thủ và tấn công lại</h2>
          <p>
            Cùng truy vấn, nhưng giá trị được bind qua Psycopg. Gửi lại đúng
            payload đó: PostgreSQL so sánh nó như một tên đăng nhập và trả về 0
            dòng.
          </p>
        </article>
        <article className="part-card part-card--3">
          <h2>Phần 3 · Đánh giá phòng thủ nhiều lớp</h2>
          <p>
            Bốn cấu hình, năm ca kiểm thử, hai mươi lần chạy thật: lớp nào chặn
            được tấn công và lớp nào chặn nhầm người dùng hợp lệ.
          </p>
          <Link to="/lab/defenses">Mở trang đánh giá</Link>
        </article>
      </div>

      <section className="facts" aria-labelledby="facts-title">
        <h2 id="facts-title">Cam kết của phòng thí nghiệm</h2>
        <dl>
          <div>
            <dt>Kết quả đo thật</dt>
            <dd>
              Mỗi lần chạy truy vấn PostgreSQL thật, có run ID và thời gian đo
              được lưu lại. Không có boolean dựng sẵn.
            </dd>
          </div>
          <div>
            <dt>Chỉ khác một biến</dt>
            <dd>
              Cùng bảng, cùng cột, cùng điều kiện <code>password = …</code>,
              cùng fixture. Chỉ khác nối chuỗi so với bind tham số.
            </dd>
          </div>
          <div>
            <dt>Cô lập</dt>
            <dd>
              Chế độ dễ bị tấn công chỉ chạy khi <code>APP_ENV=local</code> và{' '}
              <code>LAB_ENABLE_UNSAFE=true</code>, trên role chỉ đọc bảng{' '}
              <code>demo.users</code>, cổng chỉ bind 127.0.0.1.
            </dd>
          </div>
          <div>
            <dt>Không phóng đại</dt>
            <dd>
              Chặn được một payload không có nghĩa cả hệ thống miễn nhiễm SQL
              Injection. Đăng nhập SecureDesk chỉ là mô phỏng, không cấp token
              thật.
            </dd>
          </div>
        </dl>
      </section>
    </section>
  )
}
