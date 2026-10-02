# CHANGE_MEMORY

## 2026-10-02

- Form đăng nhập có Quên mật khẩu. Email gửi qua Resend, liên kết dùng một lần trong 30 phút, rồi đặt mật khẩu mới ở `/reset-password`. Email chưa có tài khoản nhận cùng một câu thông báo.
- Gửi thư quên mật khẩu dùng cùng cách với view.longdc.click: `EMAIL_FROM=noreply@longdc.click` và gọi Resend bằng HTTPS. Lỗi từ Resend hiện thẳng trên form.

## 2026-10-01

- Chữ Radar không có dấu cách được xuống dòng, không đẩy rộng cột.
- Bấm một bài Radar mở bài đó trên X. Bấm avatar hoặc tên mở trang cá nhân của người đăng.
- Radar xếp bài theo kiểu masonry và chỉ có một chỗ đang tải. Bài nhiều lượt xem, rồi nhiều bình luận, hiện trước.
- Radar giữ bài đã tải trong trình duyệt. Tải lại trang Khám phá vẫn hiện các bài đó, không gọi lại Sorsa nếu chưa quá 30 phút.
- Radar lấy bài của tất cả dự án trong Dự án của bạn, mỗi dự án một nhóm. Không còn chỉ hiện dự án đang chọn.
- Radar hiện avatar người đăng và ảnh đầy đủ trong bài. Ảnh lấy từ Sorsa, không cắt khung.
- Access code của Sorsa chỉ nhập một lần. Mã được lưu trên trình duyệt và dùng chung cho tìm bài, phân tích phong cách và cập nhật bài mẫu. Radar hiện ngay, không hỏi mã.
- Tab Khám phá có mục Radar dưới ô tìm. Radar lấy bài mới của mọi dự án trong Dự án của bạn, gọi Sorsa một lần khi mở tab, và chỉ gọi lại sau 30 phút.
- Popup phong cách dự án có nút xem bài mẫu và nút cập nhật bài mới. Mẫu mới được ghép vào danh sách và giữ tối đa 20 bài.
- Thanh cuộn mục Dự án của bạn trong menu trái là vạch trắng, không có nền track.
- Form đăng nhập và đăng ký có icon hiện hoặc ẩn mật khẩu.
- Ảnh phong cách KOL và dự án hiện 2 chữ cái của tên, không còn dấu @. Thẻ đang chọn có viền đậm. Popup chi tiết giữ header và footer, chỉ cuộn nội dung. Hai nút footer và icon với chữ trên nút được kéo gần lại.
- Lời gọi Sorsa trong Khám phá theo tài liệu API v3: bài viết đọc `full_text`, bỏ retweet có `retweeted_status`, mentions gửi handle không có `@`, lỗi chỉ lấy `message`, và thử lại khi 429 hoặc 5xx.
- Tab Phong cách bài viết khi tạo mới thêm username KOL và username dự án. Phân tích gọi Sorsa lấy bài của KOL về dự án đó, rồi điền văn phong. Bài viết không hiện ra. Để trống hai ô thì vẫn tự mô tả như trước.
- Tạo dự án từ brief Nucleus không gắn phong cách KOL mặc định. Mở dự án đã có marker Nucleus cũng bỏ KOL dựng sẵn và style `category: kol`. Phong cách bài viết hoặc dự án vẫn tự khớp.
- Ô tạo bài xoá text ngay khi gửi. Câu vừa gửi hiện ở khung xem như một lượt chat, sau đó là nội dung AI. Gửi khi ô trống dùng rule và tài liệu, đồng thời bám style nếu đang chọn. Không có style, rule và tài liệu thì báo vui lòng nhập chủ đề hoặc ý tưởng.
- Thư viện `/styles` tách phong cách đã lưu thành Phong cách KOL, Phong cách bài viết và Phong cách dự án. Tạo từ username X lưu `category: kol`. Tự mô tả giọng viết lưu `category: writing`. Lưu từ Khám phá lưu `category: project`.
- Tab Phong cách trên sidebar hiện nút X khi đang chọn một phong cách để bỏ chọn ngay, không cần mở thư viện.
- Sửa upload ảnh prompt dựng sẵn: ô chọn file phủ kín vùng thả (không dùng `sr-only`), nhận file kể cả khi MIME trống hoặc không phải `instanceof File`, lưu vào `data/uploads/prompts` và trả ảnh qua `GET /uploads/prompts/[file]`.
- Sửa và thêm prompt dựng sẵn mở trong popup, không còn form đẩy danh sách xuống phía dưới.
- Tab admin đổi URL thành `/admin/user`, `/admin/prompts`, `/admin/keys`. Tải lại trang giữ đúng tab. `/admin` chuyển về `/admin/user`.

## 2026-09-22

- Form tạo phong cách trên `/styles` thêm ô username. Sau access code, Sorsa lấy bài `from:username`, AI (provider, model và API key đã lưu trên client) phân tích tối đa 12 bài thành tên, mô tả và hướng dẫn. Lưu `kind: discovered` kèm tối đa 20 bài mẫu.
- Thư viện và hộp chi tiết chỉ hiện tên phong cách và hướng dẫn văn phong. Không hiện nội dung bài Sorsa.
- Phong cách đã lưu sửa được tên, mô tả và hướng dẫn qua `PATCH /api/styles/[styleId]`. Nút bút chì trên thẻ và nút Sửa trong hộp chi tiết. KOL dựng sẵn không sửa tại đây.

## 2026-09-21

- Bỏ tracking `next-env.d.ts` và thêm file này vào `.gitignore` theo khuyến nghị của Next.js 16.3.5; file tiếp tục được Next.js tự sinh khi dev/build/typegen.

## 2026-09-20

- Thay icon Atom bằng logo chính thức của Nucleus (`/nucleus-logo.png`) ở tab Nucleus trong sidebar và header/trạng thái trống trang Nucleus.
- Sửa lỗi avatar dự án bị banner đè ở trang chi tiết Nucleus: gán `relative z-10` cùng `shrink-0` và `bg-white` cho khối avatar thumbnail để nổi trên banner.
- Cải thiện UI header chi tiết dự án Nucleus: định vị avatar nổi bật trên mép banner, đưa tiêu đề và mô tả xuống hoàn toàn dưới nền thẻ trắng để khắc phục triệt để lỗi chữ đè lên ảnh banner; tăng kích thước và viền ring cho avatar; bổ sung chấm chỉ báo pulse cho badge trạng thái; tăng độ tương phản và khoảng cách dòng cho mô tả, hỗ trợ bố cục responsive trên desktop và mobile.
- Bỏ section giới thiệu card trắng ("Dự án đang chạy trên Nucleus") ở danh sách dự án Nucleus để giao diện gọn gàng, hiển thị ngay tiêu đề "Chiến dịch InfoFi" và lưới danh sách dự án.
- Đổi giao diện nút chuyển chế độ Viết mới / Viết lại từ tone đen nặng sang tone sáng: vỏ bọc nền xám nhạt có viền mềm mại, nút đang chọn đổi sang màu trắng nổi bật với bóng đổ nhẹ và chữ xám đậm tương phản tự nhiên với header.
- Bỏ viền active ở tab Phong cách; thư viện chỉ còn icon check khi chọn. Cài đặt gọn hơn, thêm nút Kiểm tra API, bỏ mô tả lưu key trên trình duyệt.
- Thêm portal xem chi tiết phong cách và `ConfirmDialog` thay `window.confirm` khi xoá phong cách/dự án.
- Aside desktop có thể thu gọn còn hàng icon; trạng thái được persist.
- Đăng ký tài khoản phải nhập access code (`REGISTER_ACCESS_CODE`) qua portal trước khi hiện form tạo tài khoản.
- Thêm `PORT` trong env (mặc định 3004) và `deploy.sh` để build/chạy production trên server bằng PM2.
- Login/register/admin dùng Cloudflare Turnstile. Trang `/admin` (user/pass trong env) quản lý user, API key hệ thống và style prompt.
- Access code chuyển từ đăng ký sang tab Khám phá: bấm Tìm bài viết thì mở portal, API `/api/discover` kiểm tra lại mã.
- Thêm `src/middleware.ts` xác thực JWT trên API (user/admin) trước khi vào route handler.

- Tab Khám phá chỉ bắt buộc một trong hai: username tác giả hoặc tên dự án. Tìm theo @handle dự án dùng `POST /v3/mentions` sắp theo bài nhiều bình luận nhất.
- Gọi Sorsa bằng HTTPS IPv4, timeout 45s; nếu `/mentions` lỗi thì fallback `search-tweets`. Form bỏ chữ “một trong hai”, placeholder dự án là `@PlayOnMint`.

- Sửa ảnh Nucleus: `next.config.mjs` nhận host S3 `prod-nucleus-project-thumbnail.s3.us-east-2.amazonaws.com` và wildcard `*.s3.us-east-2.amazonaws.com`; UI dùng `<img>` trực tiếp để không phụ thuộc image optimizer.
- Khi banner/thumbnail/ảnh chi tiết Nucleus lỗi (S3 chặn), hiển thị ảnh mặc định `/nucleus-fallback.svg`.
- Cache Nucleus bằng TanStack Query: stale 5 phút, giữ 30 phút, prefetch list khi hover sidebar và prefetch chi tiết khi hover card.
- Chi tiết Nucleus dùng `slug`, nếu slug trống thì dùng `id` (API Nucleus nhận cả hai).
- `project_details` trên trang chi tiết Nucleus hiển thị đủ mọi mục dạng accordion thu gọn, có mở/thu tất cả; HTML giữ ảnh `https` và bảng.
- Thêm nút `Dùng làm brief` trên trang chi tiết Nucleus: chọn tạo dự án mới hoặc dự án có sẵn, ghi brief vào tài liệu tham khảo, rule bắt buộc lấy `project_details[0]`, từ khóa gắn username X.
- Thêm tab `Nucleus` trong sidebar để xem các chiến dịch InfoFi đang có trên Nucleus.
- Thêm route `/nucleus` và `/nucleus/[slug]`; danh sách dùng `GET https://api.nucleus.codes/v1/projects/` còn chi tiết nối slug vào cùng API.
- Proxy Nucleus qua `/api/nucleus/projects` với phân trang skip/limit, sanitize HTML, và bỏ payload `users_signed_up_details`.
- Dự án không có slug vẫn hiện trên danh sách nhưng không mở được trang chi tiết.

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
