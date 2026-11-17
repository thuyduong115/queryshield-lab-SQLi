# Cửa hàng và bảng quan sát SQL (P7)

Quyết định phạm vi ngày 2026-11-13 thay thế luồng SecureDesk làm giao diện chính. Người dùng đã xác nhận cho phép thêm second-order SQL Injection và mật khẩu fixture dạng thô. Đây là lab local với dữ liệu tổng hợp; không phải cửa hàng triển khai thật.

## Các trang

- `/`: danh mục và ô tìm sản phẩm, dữ liệu đọc thật từ PostgreSQL.
- `/login`: form đăng nhập; kết quả mô phỏng, không cấp cookie/token.
- `/profile`: lưu tên khách hàng rồi tra đơn từ giá trị đã lưu.
- `/admin`: bảng quan sát dành cho người vận hành local, độc lập với đăng nhập mô phỏng. Lịch sử SQL đã che mật khẩu và các dòng trả về tự cập nhật mỗi 2 giây.
- `/lab/overview`, `/lab/comparison`, `/lab/test-results`, `/lab/defenses`: công cụ kiểm chứng đăng nhập cũ còn được giữ. `/app/*` và `/securedesk/*` là luồng tương thích cũ, không phải giao diện chính.

Lựa chọn “Bản xử lý SQL” áp dụng cho đăng nhập, tìm sản phẩm và bước đọc đơn hàng. Bước lưu hồ sơ luôn bind tham số. Khi đổi bản, kết quả cũ vẫn ghi rõ bản đã thực thi; chỉ gửi form mới tạo kết quả mới. Trang danh mục tải lại danh sách mặc định khi đổi bản; bấm tìm kiếm để chạy lại nội dung đang nhập.

## Các file mở khi quay video

Trong `apps/api/src/queryshield_api/modules/laboratory/adapters/`:

- `vulnerable.py`: toàn bộ SQL cố ý nối chuỗi cho login, search và đọc lại tên khách hàng; không có SQL không an toàn ở file khác.
- `secure.py`: đăng nhập bằng `cur.execute(SECURE_LOGIN_SQL, (username, password))`.
- `shop_queries.py`: mẫu SQL cố định, search và báo cáo bind tham số, mẫu INSERT/SELECT hồ sơ.

`modules/shop/router.py` điều phối guard → đọc dữ liệu đã lưu → adapter → PostgreSQL → quan sát. `modules/experiments/observations.py` lưu bằng chứng đã che mật khẩu qua bind tham số.

`prepare=True` trên SQL đã bị nối chuỗi chỉ chuẩn bị chính câu SQL lỗi đó. Nó không biến các giá trị đã chèn vào thành tham số. Bản an toàn phải truyền giá trị riêng trong đối số thứ hai của `execute`.

## Database fixtures-v3-shop

- `demo.users`: 4 tài khoản giả; cột `password` dạng thô, chỉ cho demo. Bcrypt cũ được bỏ khi migration và seed lại. Role app không được đọc cột này.
- `demo.products`: 6 sản phẩm công khai + 1 mẫu nội bộ.
- `demo.orders`: 2 đơn của student01; 1 đơn public và 1 đơn internal của admin.
- `demo.profiles`: các tên đã lưu bằng INSERT có bind; mỗi lần lưu tạo UUID mới để so sánh cùng bản ghi.
- `lab.observations`: ID, thao tác, bản xử lý, outcome, thời điểm, JSON bằng chứng (SQL đã che, tham số đã che, dòng kết quả, thời gian truy vấn). Không lưu body đăng nhập hay mật khẩu đã nhập.

`/admin` hiển thị trạng thái database **hiện tại**, không khẳng định đó là snapshot tại thời điểm một truy vấn cũ. Lịch sử giữ kết quả trả về lúc chạy. Danh sách quan sát giới hạn 30 mục gần nhất trong UI; hồ sơ hiển thị tối đa 30 mục. Reset bằng CLI sẽ xóa lịch sử và hồ sơ.

## Kịch bản quay

1. Chạy Compose với `.env`: `APP_ENV=local`, `LAB_ENABLE_UNSAFE=true`; cổng chỉ bind 127.0.0.1. Không thay các URL DB sang target bên ngoài.
2. Mở `/login` và `/admin` ở hai tab cùng origin. Mở source trong editor ở bên cạnh.
3. Đăng nhập `student01` / `StudentDemo123!` ở cả hai bản → thành công; sai mật khẩu → thất bại.
4. Dùng cùng tên `admin' -- ` và mật khẩu sai ở cả hai bản → nối chuỗi bypass; bind từ chối. Đối chiếu run ID trong lịch sử; mật khẩu input luôn bị che.
5. Tại `/`, tìm `Bàn phím` ở cả hai bản → cùng sản phẩm. Input `' OR true -- ` trong fixture local → bản nối chuỗi có thể trả mẫu chưa công khai; bản bind coi toàn bộ input là dữ liệu và không khớp. Kết quả phải được xác nhận từ PostgreSQL, không từ so khớp input.
6. Tại `/profile`, lưu `student01`, đọc đơn ở cả hai bản → cùng 2 đơn bình thường.
7. Lưu `admin' -- ` **một lần**. Admin cho thấy INSERT có bind và giá trị được lưu nguyên văn. Chọn nối chuỗi rồi “Xem đơn hàng” → 2 đơn admin, gồm internal; đổi sang bind rồi bấm lại trên cùng hồ sơ → 0 đơn.
8. Kết luận chính xác: Prepared Statements bảo vệ vị trí có bind; bind ở bước ghi không bảo vệ một truy vấn đọc lại vẫn nối chuỗi. Bind ở cả hai bước khắc phục lỗ hổng second-order của fixture này. Đây không phải Prepared Statements bị phá vỡ.

## Giới hạn và ranh giới

- Các ví dụ chỉ truy vấn bảng giả cố định; không có endpoint nhận SQL, URL target hay reset HTTP.
- Cả hai cờ local và unsafe phải đúng trước khi import/chạy adapter lỗi; API snapshot chứa mật khẩu fixture cũng dùng hai cờ này.
- Role truy vấn chỉ có SELECT trên users/products/orders, transaction read-only, timeout 2 giây. Role lưu hồ sơ và bằng chứng không được đọc password; role truy vấn không được ghi hay đọc lịch sử lab.
- Cả hai bản có cùng phép ILIKE; `%` và `_` vẫn là wildcard. Đây không phải SQLi và không được giải thích là bind thất bại.
- Tra đơn theo tên khách hàng chỉ minh họa SQL. Ứng dụng thật cần xác thực và kiểm tra quyền sở hữu độc lập; bind không làm thay việc đó.
- Mật khẩu dạng thô là lựa chọn minh họa riêng của fixture, không phải biện pháp xác thực cho hệ thống thật. Bảng quan sát chỉ đọc mật khẩu fixture từ DB; tuyệt đối không lưu mật khẩu vừa nhập vào lịch sử.
- SQL trên admin là bản diễn giải từ cùng builder/template của adapter, đã che mật khẩu; không phải raw DB trace. Kết quả là các dòng adapter thực sự đọc được, tối đa 20 dòng cho shop.

## Kiểm chứng

Backend: `bash scripts/test-api.sh` (cần Docker trong WSL). Frontend: `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build` trong apps/web. Browser: `bash scripts/test-e2e.sh` khi stack local đang chạy. Các bài mới ở `apps/api/tests/test_shop.py` và `tests/e2e/specs/shop.spec.ts`.

Không coi test viết ra là test đã chạy. Kết quả thực tế và những phần chưa chạy được nằm trong `harness/STATUS.md`.
