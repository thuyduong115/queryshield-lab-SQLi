# Dàn ý báo cáo đồ án

**Đề tài:** Nghiên cứu và đánh giá hiệu quả phòng thủ nhiều lớp trước tấn công SQL Injection trong ứng dụng web

## Chương 1. Tổng quan
1.1 Bối cảnh, lý do chọn đề tài · 1.2 Mục tiêu và câu hỏi nghiên cứu · 1.3 Phạm vi và giới hạn (chỉ cục bộ, dữ liệu tổng hợp, một kịch bản đăng nhập) · 1.4 Phương pháp · 1.5 Bố cục

## Chương 2. Cơ sở lý thuyết
2.1 Cách PostgreSQL phân tích câu lệnh, chuỗi ký tự và chú thích · 2.2 SQL Injection: nguyên nhân gốc là trộn mã và dữ liệu · 2.3 Các lớp phòng thủ theo OWASP: bind tham số, allow-list, quyền tối thiểu, xử lý lỗi, giám sát · 2.4 Các nghiên cứu và hướng dẫn liên quan (`docs/11-REFERENCES.md`)

## Chương 3. Phân tích và thiết kế
3.1 Yêu cầu (`docs/01-PRD.md`) · 3.2 Mô hình mối đe dọa (`docs/06-THREAT-MODEL.md`) · 3.3 Kiến trúc (`docs/02-ARCHITECTURE.md`) · 3.4 Dữ liệu và phân quyền (`docs/03-DATA-MODEL.md`) · 3.5 Thiết kế thực nghiệm và ma trận đánh giá (`docs/07-TEST-STRATEGY.md`)

## Chương 4. Triển khai và thực nghiệm
4.1 Môi trường Docker cục bộ · 4.2 Phần 1: tái hiện lỗ hổng · 4.3 Phần 2: phòng thủ và tấn công lại · 4.4 Kết quả ma trận đánh giá (lấy từ `reports/evaluation/`, ghi rõ run ID và phiên bản dữ liệu) · 4.5 Kiểm thử tự động: pytest, Playwright, Postman

## Chương 5. Đánh giá và kết luận
5.1 Trả lời câu hỏi nghiên cứu · 5.2 Giới hạn (một payload, một kịch bản; không khẳng định toàn hệ thống an toàn) · 5.3 Hướng phát triển

## Phụ lục
Hướng dẫn chạy lại · bảng phân công · nhật ký sprint (`docs/sprints/`)

> Mọi số liệu trong báo cáo phải lấy từ lần chạy thật, kèm run ID hoặc suite ID. Không chèn số minh họa.
