# QueryShield Lab

QueryShield Lab là phòng thí nghiệm SQL Injection chạy hoàn toàn trên máy cục bộ. Bên trong có **SecureDesk**, một cổng hỗ trợ nội bộ giả lập đóng vai trò hệ thống bị tấn công. Demo gồm hai phần:

1. **Lỗ hổng và cách tấn công:** backend nối chuỗi input vào câu SQL; payload `admin' -- ` đăng nhập vào `admin` với mật khẩu sai.
2. **Phòng thủ và tấn công lại:** cùng truy vấn nhưng bind tham số bằng Psycopg; gửi lại đúng payload đó thì bị từ chối.

Mọi kết quả đến từ PostgreSQL thật, có run ID và thời gian đo được lưu lại.

## Yêu cầu

Chỉ cần **Docker** (Docker Desktop hoặc Docker trong WSL) với Docker Compose v2. Toàn bộ build, cài dependency, test và E2E đều chạy trong container; không cần cài Python, Node, uv hay pnpm trên máy.

## Khởi động bằng Docker

```powershell
Copy-Item .env.example .env
# Mở .env, đặt APP_ENV=local và LAB_ENABLE_UNSAFE=true để bật Phần 1 (chỉ trên máy của bạn).
wsl docker compose --env-file .env -f infra/compose.yaml up --build
```

Compose sẽ:

- khởi động PostgreSQL 17;
- chạy `lab-admin bootstrap` một lần: tạo schema `demo`/`lab`, hai role tối thiểu quyền và seed fixture;
- khởi động API (FastAPI) và web (React + Vite).

Sau khi các health check hoàn tất (cổng mặc định, đổi được trong `.env`):

- Website: http://127.0.0.1:5173 → mục **Kịch bản demo**
- API health: http://127.0.0.1:8000/api/v1/health
- OpenAPI: http://127.0.0.1:8000/docs
- PostgreSQL cho DBeaver: `127.0.0.1:5433`

Mọi cổng chỉ bind vào loopback. Nếu `.env` để mặc định (`LAB_ENABLE_UNSAFE=false`), chế độ dễ bị tấn công trả về `403 LAB_DISABLED`; chế độ tham số hóa vẫn chạy.

## Đánh giá phòng thủ nhiều lớp

Trang **Đánh giá phòng thủ** (`/lab/defenses`) chạy cùng năm ca kiểm thử qua bốn cấu hình:

| Cấu hình | Lớp |
|---|---|
| C0 | Nối chuỗi, chỉ có giám sát |
| C1 | Nối chuỗi + allow-list tên đăng nhập (L2) |
| C2 | Bind tham số (L1) |
| C3 | Bind tham số (L1) + allow-list (L2) |

Mỗi cấu hình được đo trên: tấn công có bị chặn không, người dùng hợp lệ (gồm `o'connor` có dấu nháy) có bị chặn nhầm không, số cảnh báo của lớp giám sát (L5). Quyền của role adapter (L3) được đọc trực tiếp từ catalog PostgreSQL. Kỳ vọng được ghi sẵn trong `apps/api/src/queryshield_api/modules/evaluation/matrix.py`.

Lưu kết quả thật vào `reports/evaluation/` (JSON + Markdown, có run ID):

```powershell
python scripts/export_evaluation.py --port 8000
```

Cột thời gian trung bình gộp cả chi phí băm bcrypt của các ca thật sự chạm cơ sở dữ liệu; ca bị allow-list chặn không truy vấn nên nhanh hơn. Không dùng cột này như chi phí hiệu năng thuần của từng lớp.

## Reset dữ liệu (chỉ CLI, không có endpoint HTTP)

```powershell
wsl docker compose --env-file .env -f infra/compose.yaml run --rm lab-admin reset   # khôi phục fixture, xóa lịch sử chạy
wsl docker compose --env-file .env -f infra/compose.yaml run --rm lab-admin check   # xem phiên bản dữ liệu và số dòng
```

CLI từ chối mọi host ngoài `db`/`localhost` và mọi database ngoài `queryshield_lab`/`queryshield_lab_test`.

## Kiểm thử (tất cả trong Docker)

```bash
wsl bash scripts/test-api.sh    # Ruff + Pytest: unit + tích hợp PostgreSQL trên database queryshield_lab_test riêng
wsl bash scripts/test-web.sh    # ESLint + Prettier + Vitest + Vite build
wsl bash scripts/test-e2e.sh    # Playwright trên stack đang chạy (cần APP_ENV=local, LAB_ENABLE_UNSAFE=true)
```

Postman: import `tools/postman/QueryShield-Lab.postman_collection.json` và `tools/postman/Local.postman_environment.json`. Có thể chạy không cần cài Postman, xem [tools/postman/README.md](tools/postman/README.md).

## Cấu trúc

```text
apps/api/src/queryshield_api/
  core/                         lỗi chuẩn hóa, guard an toàn
  db/                           schema, fixture, kết nối, CLI quản trị (bootstrap/reset/check)
  modules/laboratory/           router, service, inspector, adapters/secure.py, adapters/vulnerable.py
  modules/experiments/          catalog T01–T08, runner, lưu bằng chứng
  modules/securedesk/           phiên mô phỏng của SecureDesk (không cấp token)
apps/web/src/
  app/ components/ lib/         khung, thành phần dùng chung, API client
  features/demo/                kịch bản 2 phần từng bước
  features/laboratory/          lab tự do
  features/comparison/          so sánh trước/sau
  features/test-results/        bộ kiểm thử và lịch sử chạy
  features/securedesk/          ứng dụng mục tiêu giả lập
infra/compose.yaml              db, lab-admin, api, web trên mạng Docker riêng
tests/e2e/                      Playwright
tools/postman/                  collection + environment đã làm sạch
```

## Ranh giới bảo mật

- Mã SQL nối chuỗi chỉ tồn tại ở `apps/api/src/queryshield_api/modules/laboratory/adapters/vulnerable.py`, chỉ được import khi `APP_ENV=local` **và** `LAB_ENABLE_UNSAFE=true`. Một test tĩnh kiểm tra không có chỗ nào khác nội suy SQL.
- Adapter đăng nhập chạy trên role `qs_lab_query`: chỉ `SELECT` bảng `demo.users`, giao dịch chỉ đọc, timeout 2 s. Lịch sử chạy lưu qua role `qs_lab_app`, không đọc được `password_hash`.
- Không lưu mật khẩu, body request, câu SQL hay input tự do. Đăng nhập SecureDesk thành công chỉ là mô phỏng: không cookie, không token.
- Không triển khai lên máy chủ public. Chặn được một payload không có nghĩa toàn hệ thống miễn nhiễm SQL Injection.

Tài liệu chi tiết: [docs/00-SCOPE.md](docs/00-SCOPE.md), [docs/05-DEMO-RUNBOOK.md](docs/05-DEMO-RUNBOOK.md).
