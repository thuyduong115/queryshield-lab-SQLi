# Chạy QueryShield Lab trên Windows không cần Docker

Hướng dẫn này cài và chạy toàn bộ phòng lab (PostgreSQL 17, API FastAPI, web React) trực tiếp trên một máy Windows, không dùng Docker hay WSL. Mọi thứ nằm trong thư mục repo: không cài service, không cần quyền Administrator.

> [!WARNING]
> Vẫn là công cụ học tập **chỉ chạy cục bộ**. Script cố định PostgreSQL, API và web chỉ lắng nghe trên `127.0.0.1`. Không mở các cổng này ra mạng LAN hay Internet.

## 1. Yêu cầu

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Windows | 10 (1803 trở lên) hoặc 11, 64-bit | Cần lệnh `tar` có sẵn của Windows |
| Python | 3.9 trở lên, có `pip` | Chỉ dùng để cài `uv`. `uv` sẽ tự tải Python 3.12 cho API |
| Node.js | 20 hoặc 22, có `npm`/`npx` | Script gọi `pnpm@10.15.1` qua `npx` |
| Git | bất kỳ | Để clone repo |
| Internet | lần cài đầu tiên | Tải PostgreSQL (~300 MB), Python 3.12 và các package |

Kiểm tra nhanh trong PowerShell:

```powershell
python --version
node --version
npx --version
```

Khi cài Python từ python.org, nhớ tích **Add python.exe to PATH**.

## 2. Lấy mã nguồn và cấu hình

```powershell
git clone https://github.com/thuyduong115/queryshield-lab-SQLi.git
cd queryshield-lab-SQLi
Copy-Item .env.example .env
```

Mở `.env`. Để chạy được demo tấn công (bản nối chuỗi), đặt **cả hai** biến:

```env
APP_ENV=local
LAB_ENABLE_UNSAFE=true
```

Nếu không đặt, bản có lỗ hổng trả `403 LAB_DISABLED`, còn bản bind tham số vẫn chạy bình thường.

Các cổng mặc định là `5173` (web), `8000` (API) và `5433` (PostgreSQL). Nếu trùng với chương trình khác, đổi `WEB_PORT`, `API_PORT`, `POSTGRES_PORT` trong `.env`.

## 3. Cài đặt (một lần)

```powershell
scripts\native\lab.cmd setup
```

Lệnh này làm lần lượt:

1. Tải bản **PostgreSQL 17 portable** (zip chính thức của EDB) và giải nén vào `.local\pgsql\`.
2. Tạo cụm database tại `.local\pgdata\`, chỉ nghe trên `127.0.0.1`, xác thực `scram-sha-256`.
3. Cài `uv`, tạo môi trường Python 3.12 cho API tại `apps\api\.venv\`.
4. Cài thư viện web bằng `pnpm` vào `apps\web\node_modules\`.

Chạy lại `setup` lúc nào cũng được; các bước đã xong sẽ được bỏ qua. Thư mục `.local\` đã nằm trong `.gitignore`.

## 4. Khởi động

```powershell
scripts\native\lab.cmd start
```

Script khởi động PostgreSQL, chạy `bootstrap` (tạo schema, hai role quyền tối thiểu và dữ liệu giả `fixtures-v3-shop` nếu chưa có), rồi mở **hai cửa sổ** PowerShell: một cho API, một cho web. Giữ hai cửa sổ này mở trong lúc dùng. Khi mọi thứ sẵn sàng, terminal in ra:

```text
  API  : OK   http://127.0.0.1:8000/docs
  Web  : OK   http://127.0.0.1:5173/
  DB   : OK   127.0.0.1:5433
```

| Địa chỉ | Nội dung |
|---|---|
| http://127.0.0.1:5173/ | Cửa hàng Góc Nhỏ |
| http://127.0.0.1:5173/admin | Bảng quan sát SQL |
| http://127.0.0.1:5173/lab/overview | Công cụ kiểm chứng |
| http://127.0.0.1:8000/docs | OpenAPI |

Tài khoản giả để thử: `student01` / `StudentDemo123!`. Kịch bản demo nằm trong [script-demo.md](script-demo.md).

## 5. Các lệnh khác

```powershell
scripts\native\lab.cmd status   # xem PostgreSQL, API, web có đang chạy không
scripts\native\lab.cmd stop     # tắt web, API và PostgreSQL
scripts\native\lab.cmd reset    # khôi phục dữ liệu giả, xóa lịch sử chạy (chỉ qua CLI)
scripts\native\lab.cmd check    # in phiên bản dữ liệu và số dòng
```

Đóng cửa sổ API/web chỉ tắt riêng tiến trình đó, PostgreSQL vẫn chạy nền. Muốn tắt hết thì dùng `stop`.

## 6. Kết nối database bằng DBeaver hoặc psql

- Host `127.0.0.1`, port theo `POSTGRES_PORT`, database `queryshield_lab`.
- Tài khoản quản trị cục bộ: `queryshield` / `queryshield_local_only`, trừ khi bạn đã đổi `POSTGRES_USER`/`POSTGRES_PASSWORD` trong `.env` **trước** lần `setup` đầu tiên.
- `psql` có sẵn tại `.local\pgsql\bin\psql.exe`.

API khi chạy chỉ dùng hai role quyền tối thiểu là `qs_lab_query` và `qs_lab_app`, giống bản Docker. URL quản trị chỉ được truyền cho lệnh `bootstrap`/`reset`/`check`.

## 7. Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| `Port ... is already in use` | Một chương trình khác (thường là stack Docker của repo này) đang giữ cổng. Tắt nó đi, hoặc đổi cổng trong `.env` |
| `running scripts is disabled on this system` | Dùng `lab.cmd` thay vì gọi thẳng `lab.ps1`; `lab.cmd` đã tự bỏ qua execution policy |
| `python` không tìm thấy | Cài Python và bật *Add to PATH*, rồi mở terminal mới |
| Lỗi `Cannot find matching keyid` của corepack | Script không dùng corepack mà gọi `npx pnpm@10.15.1`. Nếu tự chạy pnpm, hãy dùng cách tương tự |
| Web báo `FAIL` | Xem lỗi trong cửa sổ "QueryShield web". Thường do `node_modules` cài từ Linux/Docker: xóa `apps\web\node_modules` rồi chạy lại `setup` |
| PostgreSQL không khởi động | Xem log tại `.local\postgres.log` |
| Muốn làm lại từ đầu | `lab.cmd stop`, xóa thư mục `.local\pgdata`, rồi `lab.cmd setup` và `lab.cmd start` |

Dữ liệu của bản native (`.local\pgdata`) tách biệt với volume Docker, nên chuyển qua lại giữa hai cách chạy không ảnh hưởng nhau. Chỉ cần đừng chạy cả hai cùng lúc trên cùng cổng.
