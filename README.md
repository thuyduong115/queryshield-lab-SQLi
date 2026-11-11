# QueryShield Lab

QueryShield Lab là phòng thí nghiệm SQL Injection chạy hoàn toàn trên máy cục bộ. Dự án dùng một website React, một API FastAPI và một PostgreSQL 17. Hiện repository đã triển khai **P0 — nền tảng an toàn**, chưa có mã SQLi chủ ý.

## Yêu cầu

- Docker Desktop có Docker Compose v2.
- Nếu chạy từng ứng dụng ngoài Docker: Python 3.12+, `uv`, Node.js 22 và `pnpm` 10.

## Khởi động bằng Docker

```powershell
Copy-Item .env.example .env
wsl docker compose --env-file .env -f infra/compose.yaml up --build
```

Sau khi các health check hoàn tất:

- Website: http://127.0.0.1:5173
- API health: http://127.0.0.1:8000/api/v1/health
- OpenAPI: http://127.0.0.1:8000/docs
- PostgreSQL: `127.0.0.1:5433`

Các cổng đều chỉ bind vào loopback. Giá trị mặc định là `APP_ENV=development` và `LAB_ENABLE_UNSAFE=false`.

Tắt môi trường:

```powershell
wsl docker compose --env-file .env -f infra/compose.yaml down
```

Chỉ thêm `--volumes` khi thực sự muốn xóa toàn bộ dữ liệu PostgreSQL cục bộ.

## Phát triển API

```powershell
Set-Location apps/api
uv sync
uv run uvicorn queryshield_api.main:app --reload
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

## Phát triển web

```powershell
Set-Location apps/web
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm format:check
pnpm build
```

## Kiểm tra P0 trong WSL

Repository có một lệnh kiểm tra tập trung, tương tự quy trình của dự án tham chiếu:

```bash
wsl bash scripts/verify-p0.sh
```

Lệnh này build image, chạy Ruff + Pytest cho API và ESLint + Prettier + Vitest + Vite build cho web.

Khi chạy web ngoài Compose, đặt `VITE_API_PROXY_TARGET=http://127.0.0.1:8000` trước lệnh `pnpm dev`. Trong Compose, proxy mặc định tự dùng `http://api:8000`.

## Cấu trúc P0

```text
apps/api/          FastAPI, cấu hình an toàn và unit test
apps/web/          React + TypeScript + Vite và component test
infra/compose.yaml PostgreSQL 17, API và web trên mạng Docker riêng
tests/             Vị trí E2E ở phase sau
tools/postman/     Vị trí collection Postman ở P2
harness/STATUS.md  Bằng chứng triển khai và kiểm thử thực tế
```

## Ranh giới bảo mật

- Không bật `LAB_ENABLE_UNSAFE` ngoài `APP_ENV=local`.
- Không triển khai lên máy chủ public.
- Không dùng thông tin đăng nhập, dữ liệu khách hàng hoặc mục tiêu bên ngoài thật.
- P0 không chứa endpoint khai thác hay SQL không tham số hóa.

Phạm vi sản phẩm nằm tại [`docs/00-SCOPE.md`](docs/00-SCOPE.md). Roadmap thực thi dành riêng cho Codex và ghi chú phiên làm việc chỉ được giữ cục bộ, không đưa lên GitHub.
