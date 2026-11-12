# Quy ước đóng góp

## Phạm vi thay đổi

- Triển khai lần lượt theo các phase và task trong `BACKLOG.md`; cập nhật trạng thái task trong cùng commit.
- Không gộp tính năng của phase sau vào phase hiện tại khi gate chưa đạt.
- Mỗi phase phải cập nhật test, tài liệu vận hành và bằng chứng kiểm tra liên quan.

## Nhánh và commit

- Nhánh làm việc: `<type>/<phase>-<mo-ta-ngan>`, ví dụ `feat/p1-dual-adapters`.
- Commit theo Conventional Commits: `<type>(<scope>): <mô tả ngắn>`.
- `scope` ưu tiên mã phase: `p0`, `p1`, ..., `p5`.
- Tạo ít nhất một commit sau khi từng phase đạt gate; không commit trạng thái test đang lỗi như một phase hoàn tất.
- Không đưa file hướng dẫn riêng cho AI/Codex hoặc ghi chú phiên làm việc lên GitHub; các file này được liệt kê trong `.gitignore`.

Ví dụ:

```text
feat(p0): dựng nền tảng local an toàn
feat(p1): thêm fixture và hai adapter đăng nhập
test(p2): bổ sung kiểm tra hợp đồng REST
```

## Kiểm tra trước commit

Chạy từ WSL có Docker:

```bash
bash scripts/test-api.sh
bash scripts/test-web.sh
bash scripts/test-e2e.sh   # khi đổi giao diện hoặc API, cần stack đang chạy
```

Hoặc chạy riêng từng ứng dụng theo các lệnh trong `README.md`. Chỉ ghi kết quả `PASS` khi lệnh đã thực sự chạy thành công.

## Ranh giới bảo mật

- Mã SQL không an toàn chỉ được phép xuất hiện tại adapter đã quy định ở P1.
- Không push `.env`, dữ liệu thật, credential, log chứa secret hoặc kết quả demo giả lập.
- Không push hoặc triển khai endpoint SQLi lên môi trường public.
