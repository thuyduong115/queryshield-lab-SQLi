# Script demo — bản copy nhanh

Bản rút gọn để copy khi quay hoặc trình bày. Lời giải thích đầy đủ nằm ở [12-SHOP-DEMO.md](12-SHOP-DEMO.md).
Mọi lệnh chạy trong **PowerShell** tại thư mục gốc repo. Dữ liệu đều là fixture giả, chỉ chạy local.

> Lưu ý khoảng trắng: payload `admin' -- ` có **một dấu cách ở cuối** (sau `--`). Khi copy, giữ nguyên khoảng trắng đó.

---

## 0. Chuẩn bị (trước khi quay)

`.env` phải có:

```env
APP_ENV=local
LAB_ENABLE_UNSAFE=true
```

Khởi động stack (cổng chỉ bind 127.0.0.1):

```powershell
wsl docker compose --env-file .env -f infra/compose.yaml up -d --build --wait
```

Đưa dữ liệu về trạng thái sạch (xóa lịch sử, hồ sơ, khôi phục fixture):

```powershell
wsl docker compose --env-file .env -f infra/compose.yaml run --rm lab-admin reset
wsl docker compose --env-file .env -f infra/compose.yaml run --rm lab-admin check
```

Kết quả mong đợi của `check`: `dataset_version: fixtures-v3-shop`, `lab.runs: 0`.

Mở sẵn các tab:

| Tab | URL |
|---|---|
| Cửa hàng | http://127.0.0.1:15173/ |
| Đăng nhập | http://127.0.0.1:15173/login |
| Hồ sơ & đơn hàng | http://127.0.0.1:15173/profile |
| Bảng quan sát SQL | http://127.0.0.1:15173/admin |
| Health API | http://127.0.0.1:18000/api/v1/health |

Mở trong editor để chiếu code:

```text
apps/api/src/queryshield_api/modules/laboratory/adapters/vulnerable.py
apps/api/src/queryshield_api/modules/laboratory/adapters/secure.py
apps/api/src/queryshield_api/modules/laboratory/adapters/shop_queries.py
```

Ô chọn **Bản xử lý SQL** trên thanh vàng:
- `Phần 1 · Không bảo vệ (nối chuỗi)`: bản có lỗ hổng
- `Phần 2 · Prepared Statements`: bản bind tham số

---

## 1. Đăng nhập — `/login`

Tài khoản fixture:

| username | password |
|---|---|
| `student01` | `StudentDemo123!` |
| `admin` | `AdminDemo123!` |
| `staff01` | `StaffDemo123!` |
| `o'connor` | `OConnorDemo123!` |

### 1.1 Đối chứng: đăng nhập hợp lệ (chạy ở cả hai bản)

Tên đăng nhập:
```text
student01
```
Mật khẩu:
```text
StudentDemo123!
```
Mong đợi: **thành công** ở cả hai bản.

### 1.2 Đối chứng: sai mật khẩu (chạy ở cả hai bản)

Tên đăng nhập:
```text
student01
```
Mật khẩu:
```text
wrong-password
```
Mong đợi: **thất bại** ở cả hai bản.

### 1.3 Tấn công: bỏ qua kiểm tra mật khẩu

Chọn `Phần 1 · Không bảo vệ (nối chuỗi)`.

Tên đăng nhập (có dấu cách cuối):
```text
admin' -- 
```
Mật khẩu (cố ý sai):
```text
wrong-password
```
Mong đợi: **Đăng nhập mô phỏng thành công: admin**. Không có cookie hay token nào được cấp.

SQL mà bản nối chuỗi tạo ra (bảng quan sát hiển thị bản đã che mật khẩu):
```sql
SELECT id, username, role FROM demo.users WHERE username = 'admin' -- ' AND password = '[mật khẩu đã ẩn]' LIMIT 1
```
Ý cần nói: dấu `'` đóng chuỗi sớm, `-- ` biến phần kiểm tra mật khẩu thành chú thích.

### 1.4 Phòng thủ: cùng input, bản bind

Đổi sang `Phần 2 · Prepared Statements`, **giữ nguyên** hai ô input, bấm Đăng nhập lại.
Mong đợi: **tên đăng nhập hoặc mật khẩu không đúng**.

SQL bản an toàn:
```sql
SELECT id, username, role FROM demo.users WHERE username = %s AND password = %s LIMIT 1
```
Tham số gửi riêng: `["admin' -- ", "[mật khẩu đã ẩn]"]`. PostgreSQL tìm user có tên đúng bằng chuỗi `admin' -- `, không có nên từ chối.

### 1.5 (Tùy chọn) Tên hợp lệ có dấu nháy

Tên đăng nhập:
```text
o'connor
```
Mật khẩu:
```text
OConnorDemo123!
```
Mong đợi: bản nối chuỗi **lỗi cú pháp SQL** (`QUERY_ERROR`), còn bản bind **đăng nhập đúng**. Ví dụ này cho thấy nối chuỗi làm hỏng cả người dùng hợp lệ, không chỉ là lỗ hổng.

---

## 2. Tìm sản phẩm — `/`

### 2.1 Đối chứng (chạy ở cả hai bản)

```text
Bàn phím
```
Mong đợi: cả hai bản cùng trả **Bàn phím cơ K68**.

### 2.2 Tấn công: lộ sản phẩm chưa công khai

Chọn `Phần 1 · Không bảo vệ (nối chuỗi)`, nhập:
```text
' OR true -- 
```
Mong đợi: **7 sản phẩm**, gồm cả `[Nội bộ] Bộ thử nghiệm chưa mở bán` (published = false).

SQL bản nối chuỗi:
```sql
SELECT id, name, category, price, published FROM demo.products WHERE name ILIKE '%' OR true -- %' AND published = true ORDER BY id LIMIT 20
```
Ý cần nói: `OR true` làm điều kiện luôn đúng, `-- ` xóa bộ lọc `published = true`.

### 2.3 Phòng thủ: cùng input, bản bind

Đổi sang `Phần 2 · Prepared Statements`, bấm **Tìm kiếm** lại (danh sách mặc định tự tải khi đổi bản, nên phải bấm lại).
Mong đợi: **Không tìm thấy sản phẩm phù hợp.**

Lưu ý khi trả lời câu hỏi: `%` và `_` vẫn là wildcard của ILIKE ở cả hai bản. Đó là quy tắc tìm kiếm, không phải SQL Injection.

---

## 3. Second-order SQL Injection — `/profile`

### 3.1 Đối chứng

Ô **Tên khách hàng dùng tra đơn**:
```text
student01
```
Bấm **Lưu hồ sơ**, rồi **Xem đơn hàng** ở cả hai bản.
Mong đợi: cả hai bản trả **2 đơn** bình thường của student01.

### 3.2 Lưu payload (chỉ lưu MỘT lần)

```text
admin' -- 
```
Bấm **Lưu hồ sơ**. Mong đợi: `Đã lưu nguyên văn: admin' -- `.
Trên `/admin`: thao tác **Lưu hồ sơ** chạy bằng `Prepared Statements · SAVED`, tức INSERT có bind, an toàn.

### 3.3 Bước đọc lại có lỗ hổng

Chọn `Phần 1 · Không bảo vệ (nối chuỗi)`, bấm **Xem đơn hàng**.
Mong đợi: **2 dòng** của admin, gồm đơn `internal` `[Nội bộ] Đơn thử nghiệm`.

SQL bước đọc:
```sql
SELECT id, customer_name, item, total, visibility FROM demo.orders WHERE customer_name = 'admin' -- ' AND visibility = 'public' ORDER BY id LIMIT 20
```

### 3.4 Bind ở bước đọc

Đổi sang `Phần 2 · Prepared Statements`, bấm lại **Xem đơn hàng** trên **cùng hồ sơ** (không lưu lại).
Mong đợi: **0 dòng**.

Câu kết luận:
> Prepared Statements chỉ bảo vệ chỗ có bind. Bước ghi có bind không bảo vệ được một truy vấn đọc lại mà vẫn nối chuỗi. Bind ở cả bước ghi lẫn bước đọc thì hết lỗ hổng. Prepared Statements không bị phá vỡ.

---

## 4. Xem trực tiếp trong PostgreSQL (tùy chọn)

Mở psql trong container DB:

```powershell
wsl docker compose --env-file .env -f infra/compose.yaml exec db psql -U queryshield -d queryshield_lab
```

Chỉ chạy các câu SELECT bên dưới:

```sql
-- Tài khoản fixture (mật khẩu dạng thô chỉ dùng cho demo)
SELECT id, username, password, role FROM demo.users ORDER BY id;

-- Sản phẩm, gồm sản phẩm chưa công khai
SELECT id, name, category, price, published FROM demo.products ORDER BY id;

-- Đơn hàng public và internal
SELECT id, customer_name, item, total, visibility FROM demo.orders ORDER BY id;

-- Hồ sơ đã lưu: payload nằm nguyên văn như dữ liệu
SELECT id, customer_name FROM demo.profiles;

-- Lịch sử quan sát gần nhất
SELECT created_at, operation, mode, outcome FROM lab.observations ORDER BY created_at DESC LIMIT 10;

-- Kiểm tra lịch sử không chứa mật khẩu vừa nhập (mong đợi: 0)
SELECT count(*) FROM lab.observations WHERE detail::text LIKE '%wrong-password%';

-- Quyền tối thiểu của role truy vấn
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee LIKE 'qs_%' ORDER BY grantee, table_schema, table_name;
```

Thoát psql:
```text
\q
```

---

## 5. Postman / Newman

Import vào Postman:
```text
tools/postman/QueryShield-Lab.postman_collection.json
tools/postman/Local.postman_environment.json
```

Body mẫu để gõ tay:

`POST http://127.0.0.1:18000/api/v1/labs/login-bypass/execute`
```json
{ "mode": "vulnerable", "username": "admin' -- ", "password": "wrong-password" }
```

`POST http://127.0.0.1:18000/api/v1/shop/search`
```json
{ "mode": "vulnerable", "value": "' OR true -- " }
```

`POST http://127.0.0.1:18000/api/v1/shop/profiles`
```json
{ "value": "admin' -- " }
```

`POST http://127.0.0.1:18000/api/v1/shop/order-report` (dán `profile_id` lấy từ response trên)
```json
{ "mode": "vulnerable", "profile_id": "<profile_id>" }
```

Đổi `"mode": "vulnerable"` thành `"mode": "secure"` để so sánh.

Chạy cả collection bằng Newman (mong đợi 20 request, 54 assertion đạt):

```powershell
wsl docker run --rm --network queryshield-lab_queryshield-private -v "/mnt/d/study_codes/4th/BMvANHTTT/queryshield-lab-SQLi/tools/postman:/etc/newman" postman/newman:6-alpine run QueryShield-Lab.postman_collection.json -e Local.postman_environment.json --env-var baseUrl=http://api:8000/api/v1
```

---

## 6. Kiểm thử tự động (phần cuối demo)

Bộ T01–T09 trên web: http://127.0.0.1:15173/lab/test-results → bấm **Chạy bộ kiểm thử**. Mong đợi: 18/18 lượt đạt.
Ma trận phòng thủ: http://127.0.0.1:15173/lab/defenses → bấm **Chạy ma trận đánh giá**.

Chạy từ terminal:

```powershell
wsl bash scripts/test-api.sh
wsl bash scripts/test-e2e.sh
```

---

## 7. Sau khi demo

```powershell
wsl docker compose --env-file .env -f infra/compose.yaml run --rm lab-admin reset
wsl docker compose --env-file .env -f infra/compose.yaml down
```

Khi không demo nữa, đặt `LAB_ENABLE_UNSAFE=false` trong `.env`.
