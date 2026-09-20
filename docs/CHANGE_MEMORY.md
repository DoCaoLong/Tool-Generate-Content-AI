# CHANGE_MEMORY

## 2026-09-19

- Thêm backend Next.js Route Handlers dùng MongoDB cho users, projects và generation history.
- Thêm đăng ký, đăng nhập, đăng xuất và current-user endpoint.
- Thêm JWT session trong cookie `httpOnly`; password được hash bằng bcryptjs.
- Thêm kiểm tra quyền sở hữu dự án ở toàn bộ API project và generation.
- Thêm TanStack Query cho server state, Zustand cho UI/preference state và React Hook Form + Zod cho form.
- Thay entrypoint bằng Content Studio có giao diện ba vùng lấy cảm hứng từ ChatGPT: sidebar dự án, lịch sử hội thoại, bảng tuỳ chọn.
- Khi provider tạo content thành công, lưu input, tuỳ chọn, output và thời gian vào project hiện tại.
- Thêm `.env.example` và cập nhật README cho MongoDB/auth setup.
- Cập nhật metadata và global style theo giao diện mới.
- Xác minh `npm run build` thành công.
- Nâng Next.js và eslint-config-next lên 16.3.5; kiểm tra `npm audit --omit=dev` không còn lỗ hổng production.
- Chuyển script lint từ `next lint` đã bị loại bỏ sang ESLint flat config.
- Thêm segmented tabs `Viết mới` / `Viết lại` ở giữa header workspace theo hướng giao diện ChatGPT.
- Lưu mode vào generation history; chế độ viết lại bắt buộc nội dung nguồn và dùng prompt riêng.
- Thêm `.env.local` cho môi trường local với MongoDB tại `127.0.0.1:27017` để xử lý lỗi thiếu `MONGODB_URI`.
- Thêm mục `Phong cách KOL` dưới nút `Dự án mới`, dialog tìm kiếm/chọn style và thao tác bỏ chọn nhanh.
- Inject style KOL đã chọn vào prompt, hiển thị KOL cạnh composer và lưu snapshot style trong generation history.
- Thêm tab `Khám phá` dùng Sorsa API để tìm bài công khai theo username tác giả và tên/@username dự án.
- Thêm phân trang cursor, chọn tối đa 8 bài mẫu và áp dụng style học từ các bài đã chọn vào composer.
- Giữ `SORSA_API_KEY` hoàn toàn phía server và thêm xử lý lỗi auth, quota, rate limit, timeout của Sorsa.
- Thêm MongoDB style library với API tạo, đọc và xoá có kiểm tra quyền sở hữu.
- Khi chọn bài Sorsa, hệ thống lưu thành phong cách `discovered` rồi tự động chọn trong composer.
- Thêm form tạo phong cách riêng bằng React Hook Form với hướng dẫn văn phong và bài mẫu tuỳ chọn.
- Nâng dialog phong cách thành thư viện gồm `Phong cách của bạn` và `KOL dựng sẵn`.
- Chuyển thư viện phong cách từ modal thành page `/styles` đầy đủ.
- Tách Projects, Discover, Styles, Settings, Profile và Help thành các route riêng.
- Tách `Viết mới` và `Viết lại` thành route `/projects/[id]/new` và `/projects/[id]/rewrite` để giữ trạng thái sau reload.
- Chuyển provider/model xuống cạnh nút gửi và chuyển API key lên đầu page `/settings`.
- Thêm profile popover cuối sidebar theo mẫu menu tài khoản, liên kết tới cá nhân hoá, hồ sơ, cài đặt, trợ giúp và đăng xuất.
- Sửa lỗi Sorsa không nhận key bằng cách bỏ khai báo `SORSA_API_KEY` rỗng trong `.env.local`, cho phép dùng giá trị đã cấu hình trong `.env`.
- Chuyển các lựa chọn ngôn ngữ, giọng điệu và độ dài xuống thanh điều khiển cạnh nút gửi; loại bỏ bản trùng trong bảng tuỳ chọn bên phải.
- Lưu provider/model vào Zustand ngay khi chọn trong composer để không trở về model mặc định khi chuyển route.
- Cho phép bỏ trống tên dự án trong Khám phá; lúc này Sorsa lấy các bài gần nhất của username và style lưu lại dùng nhãn `Bài viết gần đây`.
- Bỏ icon hội thoại trước tên dự án trong sidebar và thêm thao tác đổi tên dự án có validation, cập nhật MongoDB qua API hiện có.
- Thêm ô `Rule bắt buộc` và `Tài liệu tham khảo` trong bảng tuỳ chọn; nối cả hai vào prompt và lưu snapshot cùng generation trong MongoDB.
- Chỉ hiển thị nội dung nguồn ở chế độ Viết lại và xoá giá trị nguồn khi chuyển về Viết mới để tránh đưa dữ liệu ẩn vào prompt.
- Hiển thị từ khoá bắt buộc thành chip cạnh chip phong cách trong composer, tối đa sáu chip và một chỉ báo số lượng còn lại.
- Đổi nội dung chip từ khoá từ ký hiệu `#` sang nhãn `Từ khóa: ...` và chuẩn hoá các mục sidebar về chiều cao 44px, icon đầu dòng 16px, khoảng cách đồng nhất.
- Dùng icon thư mục cho dự án và rút mục Phong cách về một dòng để danh sách sidebar thẳng hàng.
- Thêm native select có ChevronDown riêng cho composer và Settings, thay mũi tên mặc định của trình duyệt.
- Thêm provider Anthropic, xAI và OpenRouter cùng model tương ứng; gom danh sách provider/model vào module dùng chung.
- Thêm API lưu tuỳ chọn nội dung theo từng project trong MongoDB và cơ chế autosave debounce 600ms, có trạng thái lưu trên UI.
- Chuyển font toàn ứng dụng sang Inter bằng `next/font`, có subset tiếng Việt.
- Mở rộng giọng điệu dựng sẵn từ 5 lên 15 lựa chọn.
- Thay icon lấp lánh ở logo sidebar và màn hình xác thực bằng chính favicon `icon.png`.

## 2026-07-15

- Tạo AGENTS.md và các tài liệu memory/backlog ban đầu.
- Hoàn thiện prompt builder client-side, theme, KOL selector và provider OpenAI/Gemini/DeepSeek.
- Thêm các script PM2 và deploy theo workflow hiện có.
- Điều chỉnh tham số request cho dòng model OpenAI mới.
