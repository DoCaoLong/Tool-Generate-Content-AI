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
- Scope: tạo phong cách từ username (Sorsa + AI, lưu theo user) đã có trên `/styles`. Phần còn lại: sau khi đã có instruction, không nhét toàn bộ bài mẫu vào prompt generation để giảm token.

### Backlog-005: Nhân bản phong cách

- Status: proposed
- Priority: medium
- Scope: sửa tên, mô tả và hướng dẫn của phong cách đã lưu đã có trên `/styles`. Phần còn lại: nhân bản một style để thử biến thể mà không đụng bản gốc.

### Backlog-006: API key riêng cho từng provider

- Status: proposed
- Priority: medium
- Scope: lưu riêng key OpenAI, Gemini và DeepSeek trong Settings để đổi provider cạnh nút gửi mà không phải nhập lại key.

### Backlog-010: Hiện câu trả lời AI ngay trong khung chat

- Status: proposed
- Priority: medium
- Scope: stream nội dung đang viết vào bong bóng Content Studio, thay vì chỉ hiện "Đang tạo nội dung..." rồi đổi sang bản đã lưu.

### Backlog-009: Chuyển nhóm phong cách đã lưu

- Status: proposed
- Priority: low
- Scope: cho phép đổi một phong cách đã lưu giữa Phong cách KOL, Phong cách bài viết và Phong cách dự án mà không phải tạo lại.

### Backlog-008: Ảnh prompt dựng sẵn thiếu và file mồ côi

- Status: proposed
- Priority: low
- Scope: báo khi `profileImgUrl` của KOL dựng sẵn (ví dụ `/Punk9277.jpg`) không có trong `public/`, và dọn file trong `data/uploads/prompts` khi admin gỡ hoặc thay ảnh.

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

### Backlog-013: Điền sẵn chủ đề từ chiến dịch Nucleus

- Status: proposed
- Priority: low
- Scope: khi dùng brief Nucleus, tự điền ô chủ đề composer bằng tên chiến dịch và loại thưởng để người dùng chỉ cần chỉnh rồi gửi.

### Backlog-014: Lightbox xem ảnh avatar và banner dự án Nucleus

- Status: proposed
- Priority: low
- Scope: cho phép click vào thumbnail hoặc banner trong trang chi tiết dự án Nucleus để xem ảnh kích thước gốc trong popup/lightbox kèm nút tải ảnh.

### Backlog-015: Sao chép liên kết chia sẻ dự án Nucleus

- Status: proposed
- Priority: low
- Scope: thêm nút copy link nhanh trên header chi tiết dự án Nucleus kèm thông báo toast để tiện chia sẻ cho cộng đồng hoặc lưu lại xem sau.

### Backlog-016: Giữ phong cách KOL đã chọn tay trên dự án Nucleus

- Status: proposed
- Priority: low
- Scope: khi người dùng tự chọn phong cách KOL sau khi vào dự án tạo từ brief Nucleus, ghi nhớ lựa chọn đó cho lần mở lại cùng dự án, thay vì bỏ KOL mỗi lần quay lại.

### Backlog-017: Chọn bài trước khi phân tích phong cách bài viết

- Status: proposed
- Priority: low
- Scope: ở form Phong cách bài viết, sau khi Sorsa trả bài của KOL về một dự án, cho chọn bài mẫu rồi mới phân tích, giống ô chọn bài ở tab Khám phá. Hiện lấy tối đa 20 bài đầu.


