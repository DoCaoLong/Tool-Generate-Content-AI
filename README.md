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
- `REGISTER_ACCESS_CODE`: mã truy cập bắt buộc khi đăng ký tài khoản. Mặc định `content-studio`.
- `PORT`: cổng production (`next start` / PM2). Mặc định `3004`. Dev vẫn dùng `next dev -p 3000`.

## Deploy server

Trên máy chủ, trong thư mục project:

```bash
chmod +x deploy.sh
./deploy.sh
```

Script cài dependency, build, rồi chạy bằng PM2 (`create-content`). Cổng lấy từ `PORT` trong `.env`. Nếu không có git, script build bản đã upload.

Tab Nucleus lấy danh sách và chi tiết chiến dịch InfoFi từ API công khai `https://api.nucleus.codes/v1/projects/`, không cần thêm biến môi trường.
