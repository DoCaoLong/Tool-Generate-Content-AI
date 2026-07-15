# CODEBASE_MEMORY

## Repository Snapshot
- Name: `content-writer-ui`
- Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn-style UI primitives, i18next/react-i18next.
- Package manager in repo: npm (`package-lock.json` present).

## Commands
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Test: `Needs verification` (không có script test trong `package.json`)

## Entrypoints And Runtime Flow
- Main route entrypoint: `src/app/page.tsx`
- App shell/layout: `src/app/layout.tsx`
- Global styles: `src/app/globals.css`
- `page.tsx` bọc `ContentWriterUI` trong `I18nProvider`.
- `src/components/I18nProvider.tsx` và `src/lib/i18n.ts` chịu trách nhiệm khởi tạo translation context.

## Main Modules
- `src/components/ContentWriterUI.tsx`
  - Component trung tâm, chứa phần lớn state và UI flow.
  - Quản lý theme, mode (`rewrite`/`new`), URL, keyword, language, style, length, provider/model/API key, template, history, output.
  - Build prompt object từ input user.
  - Gọi client API helper để validate key và generate content.
  - Lưu theme/provider/profiles/history vào `localStorage`.
- `src/components/KOLSelector.tsx`
  - Chọn author/KOL style để inject vào prompt.
- `src/lib/api-client.ts`
  - Gọi OpenAI Chat Completions API, DeepSeek Chat Completions API, và Google Gemini API trực tiếp từ client.
  - Có helper validate API key cho từng provider.
- `src/lib/i18n.ts`
  - Khai báo resource translation cho ít nhất English và Vietnamese.
- `data/author.json`
  - Dữ liệu style author dùng cho KOL selector.
- `src/components/ui/*`
  - Tập UI primitives theo kiểu shadcn/Radix.

## Current Technical Decisions
- Ứng dụng dùng client-side state thay vì server actions hay API routes nội bộ.
- API key được nhập trong UI và lưu ở `localStorage`.
- Provider hiện có trong UI: OpenAI, Gemini, DeepSeek.
- OpenAI model list hiện giữ song song model mới và model cũ; Gemini model list cũng giữ song song model mới và model cũ để tương thích workflow hiện có.
- Prompt generation hiện là logic client-side, tập trung trong một component lớn.
- Theme dark mode dùng `class` strategy của Tailwind.
- Alias import đang dùng `@/components` và `@/lib`.

## Config Notes
- `next.config.mjs`: bật `reactStrictMode`.
- `tailwind.config.ts`: quét `./src/**/*.{ts,tsx}` và dùng CSS variables cho token màu.
- `components.json`: cấu hình shadcn style `new-york`, base color `slate`, CSS variables bật.

## Known Observations
- Repo có text đa ngôn ngữ, bao gồm tiếng Việt.
- Trong source hiện tại có dấu hiệu mojibake ở một phần text hiển thị/translation. Đây là trạng thái hiện hữu của codebase tại thời điểm setup, chưa được sửa trong bước này.
