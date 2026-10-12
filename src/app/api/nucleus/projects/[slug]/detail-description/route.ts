import { fetchNucleusProjectDetailDescription, NucleusApiError } from "@/lib/nucleus";
import { errorResponse, requireUser } from "@/lib/server-utils";
import { assertAppRequest, consumeNucleusQuota } from "@/lib/x-api-guard";

const slugOrIdPattern = /^[a-z0-9][a-z0-9-]{0,80}$/i;

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const blocked = assertAppRequest(request);
  if (blocked) return blocked;
  const limited = await consumeNucleusQuota(auth.user.id);
  if (limited) return limited;

  const { slug } = await context.params;
  if (!slugOrIdPattern.test(slug)) return errorResponse("Slug hoặc id dự án Nucleus chưa hợp lệ.");
  const title = new URL(request.url).searchParams.get("title")?.trim() || "";
  if (!title || title.length > 120 || /[\u0000-\u001f]/.test(title)) return errorResponse("Tiêu đề mục chi tiết chưa hợp lệ.");

  try {
    const section = await fetchNucleusProjectDetailDescription(slug, title);
    return Response.json({ section });
  } catch (error) {
    if (error instanceof NucleusApiError) return errorResponse(error.message, error.status);
    return errorResponse("Không thể lấy chi tiết mục chiến dịch Nucleus.", 502);
  }
}
