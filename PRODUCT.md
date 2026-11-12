# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Sinh viên trình bày (operator):** chạy lab trên laptop cá nhân và trình bày chủ đề SQL Injection trong môn Bảo mật và An toàn hệ thống thông tin, khoảng 30 phút, qua **chia sẻ màn hình trực tuyến** (Meet/Teams). Người xem nhìn trên laptop của họ qua luồng video đã nén.
- **Giảng viên / người xem:** theo dõi luồng tấn công → phòng thủ → kiểm chứng, cần thấy được nguyên nhân gốc mà không phải đọc log terminal.
- **Người chấm / reviewer:** đọc mã nguồn, chạy test, kiểm tra tính tái lập.

## Product Purpose

QueryShield Lab là nền tảng tổ chức thí nghiệm, quan sát, kiểm chứng và đánh giá biện pháp phòng thủ SQL Injection. Bên trong chứa **SecureDesk**, một ứng dụng doanh nghiệp giả lập (cổng hỗ trợ nội bộ) đóng vai trò hệ thống bị tấn công. Thành công nghĩa là: cùng một input `admin' -- ` vượt qua đăng nhập ở chế độ dễ bị tấn công và thất bại ở chế độ tham số hóa, trên cùng dữ liệu PostgreSQL thật, và kết quả tái lập được.

## Positioning

Không phải ảnh chụp màn hình "bypass login": mọi kết quả đến từ truy vấn PostgreSQL thật, cùng fixture, chỉ khác cách xây dựng câu truy vấn (nối chuỗi vs bind tham số Psycopg), và mỗi lần chạy có run ID, thời gian đo thật và bằng chứng lưu lại.

## Operating Context

- Demo gồm hai phần theo kịch bản từng bước: **Phần 1** cho thấy lỗ hổng và cách tấn công; **Phần 2** áp dụng phòng thủ và tấn công lại nhưng thất bại.
- Chạy hoàn toàn cục bộ bằng Docker Compose, cổng bind `127.0.0.1`. Công cụ phụ: Postman (API), DBeaver (xem dữ liệu fixture).

## Capabilities and Constraints

- React + TypeScript + Vite; FastAPI + Psycopg 3; PostgreSQL 17 với `pgcrypto`.
- Chế độ không an toàn chỉ bật khi `APP_ENV=local` và `LAB_ENABLE_UNSAFE=true`; mặc định tắt.
- Đăng nhập SecureDesk thành công chỉ là **kết quả mô phỏng**, không cấp cookie/token thật.
- Giao diện và tài liệu tiếng Việt; định danh mã nguồn tiếng Anh.

## Evidence on Hand

- Dữ liệu hoàn toàn tổng hợp: người dùng `admin`, `student01`, `staff01` với mật khẩu demo công khai, vài ticket hỗ trợ giả. Không có khách hàng, số liệu hiệu năng hay đánh giá thật; không được bịa thêm.

## Product Principles

1. Kết quả phải đo được, không bao giờ là boolean dựng sẵn.
2. Chỉ khác một biến: cách truyền giá trị vào SQL.
3. Không phóng đại: chặn một payload không có nghĩa toàn hệ thống an toàn.
4. Không rò rỉ: mật khẩu không xuất hiện trong log, bản ghi hay ảnh chụp.

## Accessibility & Inclusion

Đọc được qua video chia sẻ màn hình bị nén: chữ đủ lớn, tương phản cao, không truyền đạt trạng thái chỉ bằng màu.
