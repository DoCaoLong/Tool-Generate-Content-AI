# Content Studio

Workspace tạo nội dung theo dự án với giao diện hội thoại, xác thực người dùng và lịch sử được lưu trên MongoDB.

## Setup

1. Cài dependency: `npm install`
2. Sao chép `.env.example` thành `.env.local`, sau đó cấu hình MongoDB và `AUTH_SECRET`.
3. Chạy local: `npm run dev`

Open http://localhost:3000

## Environment

- `MONGODB_URI`: connection string MongoDB.
- `MONGODB_DB`: tên database, mặc định `content_writer`.
- `AUTH_SECRET`: chuỗi bí mật ngẫu nhiên tối thiểu 32 ký tự dùng để ký session.
- `SORSA_API_KEY`: API key server-side dùng cho tab Khám phá để tìm bài viết công khai trên X qua Sorsa.
