import { Atom, BookOpen, CircleHelp, KeyRound, Search } from "lucide-react";

export default function HelpPage() {
  const items = [
    { icon: BookOpen, title: "Tạo nội dung", text: "Chọn dự án, chế độ Viết mới hoặc Viết lại, sau đó nhập brief và gửi." },
    { icon: Search, title: "Khám phá phong cách", text: "Nhập username tác giả hoặc tên/@handle dự án, chọn bài mẫu rồi lưu thành phong cách cá nhân." },
    { icon: Atom, title: "Nucleus InfoFi", text: "Xem các chiến dịch đang mở trên Nucleus, thưởng, điều kiện và hướng dẫn đóng góp." },
    { icon: KeyRound, title: "Cấu hình API", text: "Mở Cài đặt từ menu tài khoản để lưu API key và provider mặc định." },
  ];
  return <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div className="mx-auto max-w-4xl"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700"><CircleHelp className="h-6 w-6" /></div><h1 className="mt-5 text-3xl font-semibold tracking-tight">Trợ giúp</h1><p className="mt-2 text-sm text-slate-500">Hướng dẫn nhanh cho các luồng chính trong Content Studio.</p><div className="mt-8 grid gap-4 md:grid-cols-2">{items.map(({ icon: Icon, title, text }) => <section key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-emerald-600" /><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></section>)}</div></div></main>;
}
