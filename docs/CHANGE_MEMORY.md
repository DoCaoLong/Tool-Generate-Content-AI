# CHANGE_MEMORY

## 2026-07-15
- Tạo `AGENTS.md` làm rule chính cho Codex trong repo.
- Tạo `docs/CODEBASE_MEMORY.md` để lưu snapshot kiến trúc, module, entrypoint, command, và quyết định kỹ thuật hiện tại.
- Tạo `docs/CHANGE_MEMORY.md` để ghi lịch sử thay đổi thực tế.
- Tạo `docs/FEATURE_BACKLOG.md` để lưu ý tưởng/chưa implement với trạng thái `proposed`.
- Tăng tương phản nền và shadow cho `Card` để tách khối nội dung khỏi page background rõ hơn.
- Đã thử nút `Generate Content` floating/fixed ở đáy màn hình khi scroll xuống, sau đó gỡ bỏ theo phản hồi UI.
- Siết rule prompt để cấm dấu `--` trong output và yêu cầu ngắt đoạn ngắn thay vì dồn một block dài.
- Chuyển khối `History` xuống dưới khu vực `Output`.
- Tăng thêm độ tương phản của `Card` bằng nền đặc hơn, viền rõ hơn, và shadow mạnh hơn.
- Thiết kế lại `KOLSelector` theo layout gọn hơn và tăng tương phản cho từng item/card KOL.
- Đặt dark mode làm mặc định ngay từ HTML ban đầu và thêm script khởi tạo theme sớm để tránh flash light mode khi load trang.
- Tối giản item KOL để chỉ hiển thị ảnh, tên, và mô tả 2 dòng; thông tin đầy đủ chỉ xem trong dialog chi tiết.
- Thêm provider `DeepSeek` với model `deepseek-v4-flash` và `deepseek-v4-pro`, cùng luồng validate/generate API tương ứng.
- Cập nhật danh sách model OpenAI sang dòng GPT-5.6 và cập nhật Gemini sang các model Gemini 2.5 / 3.1 mới hơn trong UI.
- Khôi phục các model OpenAI/Gemini cũ trong dropdown để giữ backward compatibility thay vì chỉ giữ model mới.
