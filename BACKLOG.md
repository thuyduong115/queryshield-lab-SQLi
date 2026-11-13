# Product Backlog

Đề tài: **Nghiên cứu và đánh giá hiệu quả phòng thủ nhiều lớp trước tấn công SQL Injection trong ứng dụng web.** Nhóm 4 người.

Trạng thái: To Do / In Progress / Done. Cập nhật file này trong cùng commit với thay đổi.

## Phân vai

| Vai | Phụ trách chính |
|---|---|
| TV1 · Nền tảng | Hạ tầng Docker, schema, phân quyền DB, CLI quản trị, CI |
| TV2 · Phòng thủ | Các lớp L1–L5 trong API, inspector, hợp đồng REST |
| TV3 · Giao diện | Website lab, SecureDesk, trang đánh giá, E2E |
| TV4 · Đánh giá | Ma trận thực nghiệm, số liệu, báo cáo, slide |

## P0–P4 · Nền tảng lab (đã xong)

| ID | Task | Vai | Trạng thái |
|---|---|---|---|
| P0-1 | Repo, Compose cục bộ, health check | TV1 | Done |
| P1-1 | Schema `demo`/`lab`, fixture bcrypt, role tối thiểu quyền | TV1 | Done |
| P1-2 | CLI `lab-admin` bootstrap/reset/check | TV1 | Done |
| P1-3 | Adapter nối chuỗi (có guard) và adapter bind tham số | TV2 | Done |
| P2-1 | REST API, lỗi chuẩn hóa, run ID, lưu bằng chứng | TV2 | Done |
| P2-2 | Inspector phân đoạn, che mật khẩu | TV2 | Done |
| P2-3 | Collection Postman + chạy Newman | TV4 | Done |
| P3-1 | Kịch bản demo 7 bước, lab tự do, so sánh | TV3 | Done |
| P3-2 | SecureDesk mô phỏng (không cấp token) | TV3 | Done |
| P4-1 | Bộ test T01–T08, trang kiểm thử | TV4 | Done |
| P4-2 | Playwright E2E, workflow CI | TV3 | Done |

## P6 · Phòng thủ nhiều lớp và đánh giá (ADR-017)

| ID | Task | Vai | Trạng thái |
|---|---|---|---|
| P6-1 | Tài liệu: ADR-017, phạm vi, ma trận test, dàn ý báo cáo, backlog | TV4 | Done |
| P6-2 | Fixture `o'connor` (người dùng hợp lệ có dấu nháy), `fixtures-v2` | TV1 | Done |
| P6-3 | L2 allow-list tên đăng nhập, bật/tắt theo request | TV2 | Done |
| P6-4 | L4 che chi tiết lỗi SQL | TV2 | Done |
| P6-5 | L5 giám sát phát hiện: bảng sự kiện, không lưu input thô | TV2 | Done |
| P6-6 | L3 đo quyền thật của role từ catalog PostgreSQL | TV1 | Done |
| P6-7 | Ma trận đánh giá C0–C3, API chạy và lưu kết quả | TV4 | Done |
| P6-8 | Trang “Đánh giá phòng thủ” trên web | TV3 | Done |
| P6-9 | Xuất kết quả đánh giá (JSON/Markdown) vào `reports/evaluation/` | TV4 | Done |
| P6-10 | Test pytest + E2E cho P6 | TV3 | Done |

## P5 · Báo cáo và trình bày

| ID | Task | Vai | Trạng thái |
|---|---|---|---|
| P5-1 | Sơ đồ kiến trúc, tuần tự, phân quyền (`docs/diagrams/`) | TV1 | To Do |
| P5-2 | Báo cáo chương 1–3 theo `docs/report/outline.md` | TV4 | To Do |
| P5-3 | Báo cáo chương 4–5 với số liệu thật từ `reports/evaluation/` | TV4 | To Do |
| P5-4 | Slide và kịch bản quay demo | TV3 | To Do |
| P5-5 | Hướng dẫn DBeaver, rà soát tái lập trên máy khác | TV1 | To Do |
