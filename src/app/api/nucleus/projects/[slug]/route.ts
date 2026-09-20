import { fetchNucleusProject, NucleusApiError } from "@/lib/nucleus";
import { errorResponse, requireUser } from "@/lib/server-utils";

const slugOrIdPattern = /^[a-z0-9][a-z0-9-]{0,80}$/i;

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { slug } = await context.params;
  if (!slugOrIdPattern.test(slug)) return errorResponse("Slug hoặc id dự án Nucleus chưa hợp lệ.");

  try {
    const project = await fetchNucleusProject(slug);
    return Response.json({ project });
  } catch (error) {
    if (error instanceof NucleusApiError) return errorResponse(error.message, error.status);
    return errorResponse("Không thể lấy chi tiết dự án Nucleus.", 502);
  }
}
