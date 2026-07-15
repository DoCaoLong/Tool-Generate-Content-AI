# AGENTS.md

## Scope
- Repo này là UI Next.js cho công cụ tạo prompt/content writer.
- Mục tiêu chính hiện tại: giao diện nhập cấu hình, build prompt đa ngôn ngữ, lưu state cục bộ, và gọi provider OpenAI/Gemini trực tiếp từ client.
- Khi setup instruction/memory, không sửa source app trừ khi user yêu cầu riêng.

## Build, Test, Lint
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start production: `npm run start`
- Lint: `npm run lint`
- Test: `Needs verification` (không thấy script test trong `package.json`)

## Coding Conventions
- Giữ TypeScript + React function components theo style hiện có.
- Tôn trọng cấu trúc Next.js App Router trong `src/app`.
- Reuse UI primitives trong `src/components/ui` trước khi tạo component mới.
- Utility code đặt trong `src/lib`.
- Không đổi command, model list, hoặc text sản phẩm nếu chưa xác minh tác động.
- Ưu tiên thay đổi nhỏ, cục bộ; không refactor rộng nếu không phục vụ trực tiếp task.

## Context Efficiency Rules
- Đọc file theo thứ tự ưu tiên, không scan toàn repo nếu chưa cần.
- Mỗi task chỉ mở thêm file khi file hiện tại không đủ trả lời hoặc không đủ để sửa.
- Với UI/task nhỏ, ưu tiên đọc entrypoint, component liên quan, và lib liên quan trước.
- Không suy diễn test/lint/build command. Nếu không thấy rõ, ghi `Needs verification`.

## Encoding And Text Rules
- Tất cả file text mới hoặc cập nhật phải lưu UTF-8.
- Repo này có text tiếng Việt và đa ngôn ngữ. Luôn kiểm tra dấu tiếng Việt, ký tự CJK, và ký tự đặc biệt sau khi chỉnh sửa để tránh mojibake.
- Không copy/paste text đã lỗi encoding vào source hoặc docs như thể đó là dữ liệu đúng.
- Nếu phát hiện chuỗi hiển thị lỗi encoding trong code hiện hữu, nêu rõ trong phản hồi hoặc backlog phù hợp; không tự sửa ngoài phạm vi task.

## File-First Reading Order
1. `package.json`
2. `README.md`
3. `src/app/page.tsx`
4. `src/app/layout.tsx`
5. File component hoặc module gắn trực tiếp với task
6. `src/lib/*` liên quan
7. Config liên quan như `next.config.mjs`, `tailwind.config.ts`, `components.json`

## Memory Update Rules
- Cập nhật `docs/CODEBASE_MEMORY.md` khi kiến trúc, flow, module, command, hoặc quyết định kỹ thuật hiện tại thay đổi thật.
- Cập nhật `docs/CHANGE_MEMORY.md` chỉ với thay đổi đã thực hiện thật trong repo.
- Không ghi ý tưởng chưa implement vào `docs/CHANGE_MEMORY.md`.
- Không ghi ý tưởng chưa implement vào `docs/CODEBASE_MEMORY.md`.
- Nếu tạo feature mới đáng theo dõi nhưng chưa làm, ghi vào `docs/FEATURE_BACKLOG.md` với `Status: proposed`.

## Feature Suggestion Rules
- Sau khi hoàn thành một feature hoặc fix, luôn đề xuất ít nhất một follow-up feature liên quan.
- Không tự implement follow-up feature nếu user chưa yêu cầu.
- Chỉ thêm follow-up vào `docs/FEATURE_BACKLOG.md` khi nó đủ cụ thể và đáng lưu.
- Mọi mục backlog chưa làm phải ghi `Status: proposed`.

## Final Checklist
- Xác nhận đã đọc đủ file để hiểu task, không scan thừa.
- Xác nhận command nêu ra là command có thật trong repo, hoặc ghi `Needs verification`.
- Xác nhận docs memory được cập nhật đúng vai trò từng file.
- Xác nhận không đưa ý tưởng chưa implement vào change/codebase memory.
- Xác nhận file text giữ UTF-8 và không tạo thêm mojibake.
- Nếu đã sửa code/đổi hành vi, cân nhắc follow-up feature và nêu riêng, không tự làm.
