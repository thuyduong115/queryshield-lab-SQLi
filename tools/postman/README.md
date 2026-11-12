# Postman

- `QueryShield-Lab.postman_collection.json`: health, danh sách kịch bản, test case, T01/T02, tấn công T03 ở chế độ dễ bị tấn công, phiên SecureDesk mô phỏng, tấn công lại T03 ở chế độ tham số hóa, đọc run, chạy bộ kiểm thử, kết quả gần nhất. Mỗi request có test kiểm tra mã HTTP, `outcome`, không có `Set-Cookie` và mật khẩu không bị phản hồi lại.
- `Local.postman_environment.json`: chỉ có `baseUrl=http://127.0.0.1:8000/api/v1`. Đổi cổng nếu bạn đặt `API_PORT` khác.

Mật khẩu dùng trong collection là fixture công khai dùng một lần (`StudentDemo123!`, `wrong-password`), lưu ở biến collection. Không thêm thông tin đăng nhập thật.

Cần bật `APP_ENV=local` và `LAB_ENABLE_UNSAFE=true` để request T03 dễ bị tấn công trả về 200.

## Chạy không cần cài Postman (Newman trong Docker)

```bash
docker run --rm --network queryshield-lab_queryshield-private \
  -v "$PWD/tools/postman:/etc/newman" postman/newman:6-alpine \
  run QueryShield-Lab.postman_collection.json -e Local.postman_environment.json \
  --env-var baseUrl=http://api:8000/api/v1
```
