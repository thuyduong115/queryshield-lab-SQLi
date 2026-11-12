# Tests

| Tầng | Vị trí | Lệnh (Docker) |
| --- | --- | --- |
| Unit + tích hợp PostgreSQL + API | `apps/api/tests/` | `wsl bash scripts/test-api.sh` |
| Component (Vitest) | `apps/web/src/App.test.tsx` | `wsl bash scripts/test-web.sh` |
| E2E trình duyệt (Playwright) | `tests/e2e/specs/` | `wsl bash scripts/test-e2e.sh` |
| REST thủ công / Newman | `tools/postman/` | xem `tools/postman/README.md` |

Test tích hợp API chạy trên database riêng `queryshield_lab_test`, được tạo lại mỗi phiên; không đụng tới `queryshield_lab`. Khi thiếu `TEST_ADMIN_DATABASE_URL`, chúng được báo **skipped**, không bao giờ báo passed.

E2E chạy trên stack Compose đang chạy, từ container Playwright nối vào mạng riêng của Compose. Ảnh chụp minh họa: `CAPTURE_SCREENS=1 wsl bash scripts/test-e2e.sh specs/screens.spec.ts` (ghi vào `tests/e2e/screens/`, đã gitignore).
