import { fetchNucleusProjects, NucleusApiError } from "@/lib/nucleus";
import { errorResponse, requireUser } from "@/lib/server-utils";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const skip = Number(url.searchParams.get("skip") || 0);
  const limit = Number(url.searchParams.get("limit") || 10);
  if (!Number.isInteger(skip) || skip < 0) return errorResponse("Tham số skip chưa hợp lệ.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) return errorResponse("Tham số limit chưa hợp lệ.");

  try {
    const data = await fetchNucleusProjects(skip, limit);
    return Response.json(data);
  } catch (error) {
    if (error instanceof NucleusApiError) return errorResponse(error.message, error.status);
    return errorResponse("Không thể lấy danh sách dự án Nucleus.", 502);
  }
}
