# FEATURE_BACKLOG

## Proposed

### Backlog-001: Chuẩn hoá UTF-8 cho phần UI legacy

- Status: proposed
- Priority: medium
- Scope: rà soát `src/lib/i18n.ts`, `src/components/ContentWriterUI.tsx` và dữ liệu author để loại bỏ mojibake còn tồn tại.

### Backlog-002: So sánh và xuất phiên bản nội dung

- Status: proposed
- Priority: medium
- Scope: cho phép chọn hai generation trong cùng dự án để xem khác biệt, sau đó xuất bản được chọn sang Markdown hoặc DOCX.

### Backlog-004: Hồ sơ phong cách đã phân tích

- Status: proposed
- Priority: medium
- Scope: dùng AI tổng hợp các bài mẫu Sorsa thành một style profile ngắn, lưu MongoDB theo user/project để giảm token và tái sử dụng ổn định.

### Backlog-005: Chỉnh sửa và nhân bản phong cách

- Status: proposed
- Priority: medium
- Scope: cho phép sửa tên, instruction, bài mẫu hoặc nhân bản một style đã lưu để thử biến thể mà không làm mất bản gốc.

### Backlog-006: API key riêng cho từng provider

- Status: proposed
- Priority: medium
- Scope: lưu riêng key OpenAI, Gemini và DeepSeek trong Settings để đổi provider cạnh nút gửi mà không phải nhập lại key.

### Backlog-007: Ghi nhớ tuỳ chọn soạn bài nhanh

- Status: proposed
- Priority: low
- Scope: lưu ngôn ngữ, giọng điệu và độ dài gần nhất theo người dùng để các lựa chọn này không trở về mặc định khi chuyển route hoặc tải lại trang.

### Backlog-008: Lưu trữ dự án

- Status: proposed
- Priority: low
- Scope: cho phép archive dự án ít dùng để ẩn khỏi sidebar mà không xoá lịch sử, đồng thời có trang xem và khôi phục dự án đã lưu trữ.

### Backlog-009: Tải tệp tài liệu tham khảo

- Status: proposed
- Priority: medium
- Scope: cho phép tải lên PDF, DOCX hoặc TXT, trích xuất nội dung an toàn và đưa vào trường tài liệu tham khảo thay vì phải sao chép thủ công.

### Backlog-010: Quản lý từ khoá trực tiếp trên chip

- Status: proposed
- Priority: low
- Scope: thêm nút xoá trên từng chip từ khoá và thao tác thêm nhanh ngay tại composer mà không cần mở bảng tuỳ chọn.

### Backlog-011: Giọng điệu tự tạo

- Status: proposed
- Priority: low
- Scope: cho phép người dùng tự đặt tên và mô tả một giọng điệu, lưu vào tài khoản rồi dùng như lựa chọn có sẵn trong composer.
