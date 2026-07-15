# FEATURE_BACKLOG

## Proposed

### Backlog-001: Fix UTF-8 / mojibake for multilingual UI text
- Status: proposed
- Priority: medium
- Why:
  - Repo đang có dấu hiệu lỗi encoding trong một phần text tiếng Việt và nhãn đa ngôn ngữ.
  - Vấn đề này ảnh hưởng trực tiếp đến UX và độ an toàn khi chỉnh sửa thêm i18n content.
- Likely scope:
  - Rà soát `src/lib/i18n.ts`
  - Rà soát text hardcoded trong `src/components/ContentWriterUI.tsx`
  - Chuẩn hóa lưu file UTF-8 và xác minh hiển thị
