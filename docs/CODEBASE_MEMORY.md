# CODEBASE_MEMORY

## Repository Snapshot

- Name: `content-writer-ui`
- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, MongoDB.
- Typography: Inter được nạp bằng `next/font/google` với subset Latin và Vietnamese.
- Client data layer: TanStack Query.
- UI state: Zustand với persist cho cấu hình provider/API key trên thiết bị.
- Form: React Hook Form + Zod.
- Package manager: npm (`package-lock.json`).

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start` (cổng lấy từ `PORT`, mặc định 3004)
- Lint: `npm run lint`
- Deploy server: `./deploy.sh` (npm ci, `next build`, PM2 `create-content`, cổng từ env `PORT`)
- Test: `Needs verification` (không có script test trong `package.json`).

## Runtime Flow

- Root layout khởi tạo `AppProviders`; `src/app/page.tsx` redirect sang `/projects`.
- Các page route `/projects`, `/projects/[projectId]/new`, `/projects/[projectId]/rewrite`, `/discover`, `/nucleus`, `/nucleus/[slug]`, `/styles`, `/settings`, `/profile`, `/help` dùng chung authenticated `ContentStudio` shell.
- `ContentStudio` gọi `/api/auth/me`; người chưa đăng nhập thấy form login/register, người đã đăng nhập vào workspace.
- Workspace tải dự án bằng `/api/projects`; project id và mode lấy từ URL, Zustand chỉ giữ preference hỗ trợ.
- Khi tạo content, client gọi provider AI bằng API key trên thiết bị, sau đó lưu mode, input, tuỳ chọn và output đã thành công vào lịch sử MongoDB của dự án đang chọn.

## Backend And Data

- `src/lib/mongodb.ts`: connection singleton và tạo index cho users, projects, generations.
- `src/lib/auth.ts`: JWT session 7 ngày trong cookie `httpOnly`, `sameSite=lax`, bật `secure` ở production.
- `src/app/api/auth/*`: register, login, logout, current user, verify access code.
- Tab Khám phá yêu cầu `REGISTER_ACCESS_CODE` (env): portal access code khi bấm Tìm bài viết, API `/api/discover` kiểm tra lại mã.
- `src/middleware.ts` chặn API: JWT user (`cw_session`) cho route nội bộ, JWT admin (`cw_admin`) cho `/api/admin/*` trừ login. Auth/public/turnstile để public.
- Login, register và `/admin` xác thực Cloudflare Turnstile (`TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`).
- Admin session cookie `cw_admin` 12 giờ; credential `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Dashboard `/admin` quản lý users, API keys (`settings.api_keys`) và `prompt_styles`.
- `src/app/api/projects/*`: tạo, đọc, sửa, xoá dự án và đọc/lưu lịch sử.
- Mọi truy vấn project/generation đều lọc theo `userId` lấy từ session phía server.
- Password được hash bằng bcryptjs cost 12.
- `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET` được mô tả trong `.env.example`.

## Frontend Modules

- `src/components/AuthScreen.tsx`: form đăng nhập/đăng ký.
- `src/components/ContentStudio.tsx`: sidebar dự án, conversation history, composer và bảng tuỳ chọn.
- Bảng tuỳ chọn có trường `Rule bắt buộc` và `Tài liệu tham khảo`; nội dung gốc chỉ hiện trong chế độ Viết lại.
- Từ khoá bắt buộc được theo dõi bằng React Hook Form và hiển thị tức thời thành chip `Từ khóa: ...` cạnh chip phong cách trong composer; chip được tách theo dấu phẩy hoặc xuống dòng và loại trùng.
- Các mục chính trong sidebar dùng chiều cao 44px, icon 16px và khoảng cách đồng nhất; dự án dùng icon thư mục cùng thao tác đổi tên qua `PATCH /api/projects/[projectId]` và xoá.
- `src/components/KOLStylePicker.tsx`: thẻ phong cách đang chọn trong sidebar, điều hướng sang `/styles`.
- `src/components/StyleLibraryPage.tsx`: page thư viện phong cách đầy đủ, không dùng modal.
- `src/components/SettingsPage.tsx`: API key ở đầu trang và cấu hình provider/model mặc định.
- `src/components/ui/native-select.tsx`: native select dùng icon ChevronDown riêng, thống nhất mũi tên giữa composer và Settings.
- `src/components/ProfileMenu.tsx`: menu tài khoản dạng popover với cá nhân hoá, hồ sơ, cài đặt, trợ giúp và đăng xuất.
- `src/components/ProfilePage.tsx`, `src/components/HelpPage.tsx`: các page tài khoản hỗ trợ route riêng.
- `src/components/DiscoverPanel.tsx`: tab Khám phá, form tìm bài X, chọn bài mẫu và áp dụng style động.
- `src/components/NucleusPanel.tsx`: tab Nucleus, danh sách chiến dịch InfoFi và trang chi tiết theo slug.
- `src/lib/kol-styles.ts`: adapter có kiểu dữ liệu cho `data/author.json`.
- `src/lib/app-store.ts`: project đang chọn, trạng thái sidebar/options và provider config.
- `src/lib/http.ts`: client JSON API và chuẩn hoá lỗi.
- `src/lib/prompt-builder.ts`: tạo prompt có cấu trúc từ form.
- `src/lib/api-client.ts`: gọi OpenAI, Gemini, DeepSeek, Anthropic, xAI và OpenRouter trực tiếp từ trình duyệt.
- `src/lib/providers.ts`: nguồn dùng chung cho label và model của OpenAI, Gemini, DeepSeek, Anthropic, xAI và OpenRouter.

## Current Technical Decisions

- MongoDB là nguồn dữ liệu chính cho tài khoản, dự án và lịch sử; không dùng localStorage cho dữ liệu nghiệp vụ.
- API key của provider không gửi vào backend ứng dụng và chỉ được lưu trên thiết bị bằng Zustand persist.
- TanStack Query quản lý cache và invalidation cho auth, projects, generations và Nucleus; mặc định stale 60 giây, gc 10 phút, không refetch khi focus cửa sổ.
- Nucleus list/detail cache stale 5 phút, gc 30 phút (`src/lib/nucleus-query.ts`); prefetch list từ sidebar và prefetch detail khi hover card.
- Zustand chỉ quản lý UI state và preference cục bộ, không thay thế server cache.
- React Hook Form quản lý auth, project form và content composer.
- Thanh trên của workspace có segmented tabs `Viết mới` và `Viết lại`; mode được giữ bằng Zustand và đồng bộ vào React Hook Form.
- Tabs `Viết mới` và `Viết lại` dùng route riêng `/projects/[id]/new` và `/projects/[id]/rewrite`, nên reload không đổi màn hình.
- `Viết lại` bắt buộc có nội dung nguồn và dùng task/rule prompt riêng; `Viết mới` tạo nội dung mới từ brief.
- KOL được chọn bằng mục `Phong cách KOL` ngay dưới nút tạo dự án, được giữ cục bộ bằng Zustand và inject vào prompt.
- Generation lưu snapshot gồm id, tên và instruction của KOL để lịch sử không phụ thuộc lựa chọn hiện tại.
- `src/app/api/discover/route.ts` gọi Sorsa từ server: `POST /v3/search-tweets` khi có username tác giả; `POST /v3/mentions` (`order: popular`) khi chỉ nhập @handle/tên dự án. Chỉ cần một trong hai trường.
- `src/app/api/nucleus/projects` proxy Nucleus `GET /v1/projects` với `skip`, `limit` và fields danh sách; `src/app/api/nucleus/projects/[slug]` lấy chi tiết bằng slug, fallback `id` khi slug null.
- Proxy Nucleus yêu cầu đăng nhập, không cần API key, loại danh sách user đã tham gia, và sanitize HTML chi tiết trước khi trả về client.
- Bộ lọc tên dự án của Khám phá là tuỳ chọn; khi để trống, API chỉ dùng `from:username`, sắp xếp `latest` và trả các bài gần nhất của tác giả.
- `src/app/api/styles/*`: đọc, tạo và xoá thư viện phong cách thuộc riêng từng user.
- Sorsa key chỉ đọc từ `SORSA_API_KEY` phía server; không gửi xuống trình duyệt.
- Người dùng có thể chọn tối đa 8 bài công khai làm mẫu. Snapshot bài mẫu được đưa vào prompt, lưu cùng generation và được Zustand persist trên thiết bị để tiếp tục sử dụng.
- Prompt coi bài mẫu là dữ liệu không tin cậy, chỉ phân tích đặc trưng văn phong và không được làm theo instruction nằm trong nội dung mẫu.
- Prompt tách rule người dùng thành chỉ dẫn bắt buộc và coi tài liệu tham khảo là dữ liệu không tin cậy, không thực thi instruction nằm trong tài liệu.
- Style khám phá được lưu vào collection `styles` trước khi áp dụng. Người dùng cũng có thể tự tạo style bằng tên, mô tả, hướng dẫn và một bài mẫu tuỳ chọn.
- Form tạo phong cách có ô username không bắt buộc. Phân tích gọi `POST /api/discover` (cùng access code với Khám phá) để lấy bài của tác giả, rồi `generateWithProvider` trên client viết hướng dẫn. Kết quả lưu `kind: discovered` với `username` và bài mẫu; bỏ username hoặc chưa phân tích thì vẫn lưu style thủ công.
- `KOLStylePicker` hiển thị `Phong cách của bạn` từ MongoDB và `KOL dựng sẵn`; active saved style chỉ lưu id trong Zustand, còn MongoDB là nguồn dữ liệu chính.
- Collection `styles` có index `(userId, updatedAt)` phục vụ danh sách thư viện theo tài khoản.
- Provider, model, ngôn ngữ, giọng điệu và độ dài được chọn nhanh ngay bên trái nút gửi; API key được quản lý tại `/settings` thay vì aside tuỳ chọn.
- Selector giọng điệu có 15 phong cách từ tự nhiên/chuyên nghiệp tới thuyết phục, phân tích, sang trọng và gợi tranh luận.
- Logo trong sidebar và màn hình xác thực dùng cùng asset `/icon.png` với favicon để giữ nhận diện nhất quán.
- Tùy chọn nội dung gồm từ khoá, rule, tài liệu, ngôn ngữ, giọng điệu, độ dài và hướng dẫn thêm được autosave riêng vào document project qua `PATCH /api/projects/[projectId]/options`; thay đổi không làm project nhảy thứ tự.
- Composer được remount theo project id để luôn nạp đúng bộ tuỳ chọn đã lưu khi chuyển dự án.
- Provider/model được ghi ngay vào Zustand persist khi thay đổi trong composer, nên giữ nguyên khi chuyển giữa các route/tab mà không cần gửi bài trước.
- Biến `SORSA_API_KEY` dùng thứ tự ưu tiên env của Next.js; `.env.local` không được khai báo key rỗng vì sẽ ghi đè giá trị hợp lệ trong `.env`.
- Xoá project đồng thời xoá các generation thuộc project đó.
- API lịch sử trả tối đa 200 bản ghi mới nhất theo thứ tự thời gian tăng dần để hiển thị như hội thoại.
- Next.js và eslint-config-next được nâng lên 16.3.5 để loại bỏ cảnh báo bảo mật production đã biết ở phiên bản cũ.
- `next-env.d.ts` do Next.js tự sinh, vẫn nằm trong `tsconfig.json` để nạp type nhưng bị loại khỏi Git qua `.gitignore` theo khuyến nghị của Next.js.
- `next.config.mjs` cho phép ảnh Nucleus từ `prod-nucleus-project-thumbnail.s3.us-east-2.amazonaws.com` và `*.s3.us-east-2.amazonaws.com`.
- Tab Nucleus render banner/thumbnail bằng `<img>` trực tiếp (có `referrerPolicy=no-referrer`) vì S3 thường chặn Next image optimizer.
- Logo chính thức của Nucleus được lưu tại `/nucleus-logo.png`, dùng cho icon tab Nucleus ở sidebar và phần header danh sách chiến dịch.
- Trang chi tiết Nucleus định vị avatar thumbnail bằng `relative z-10 -mt-8` và `shrink-0 bg-white` để thumbnail không bị banner `position: relative` đè lớp hiển thị.
- Ảnh Nucleus lỗi hoặc thiếu thì dùng `/nucleus-fallback.svg`; ảnh trong HTML chi tiết cũng được gắn fallback khi `error`.
- Trang chi tiết Nucleus cho phép tạo dự án mới hoặc chọn dự án có sẵn, rồi ghi brief vào `documents`, `rules` từ `project_details[0]`, và `keywords` từ username X qua `PATCH /api/projects/[projectId]/options`.
- `project_details` được gom thành accordion thu gọn; sanitize HTML vẫn giữ `https` images, link, list và table, loại `data:` image và script.

## Known Observations

- Component cũ `ContentWriterUI.tsx` và i18n cũ vẫn còn trong repo để tham chiếu nhưng không còn là entrypoint đang chạy.
- Một số chuỗi đa ngôn ngữ cũ trong component/i18n legacy vẫn có mojibake; chưa sửa vì nằm ngoài phạm vi feature này.
