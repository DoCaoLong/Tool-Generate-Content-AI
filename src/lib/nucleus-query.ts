import type { QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/http";
import type { NucleusProject, NucleusProjectDetail } from "@/lib/types";

export const NUCLEUS_PAGE_SIZE = 100;
export const NUCLEUS_STALE_TIME = 5 * 60_000;
export const NUCLEUS_GC_TIME = 30 * 60_000;

export const nucleusKeys = {
  all: ["nucleus"] as const,
  list: () => [...nucleusKeys.all, "list"] as const,
  detail: (slug: string) => [...nucleusKeys.all, "detail", slug] as const,
  detailDescription: (projectKey: string, title: string) => [...nucleusKeys.all, "detail-description", projectKey, title] as const,
};

export type NucleusListPage = { projects: NucleusProject[]; count: number };
export type NucleusDetailResponse = { project: NucleusProjectDetail };
export type NucleusDetailDescriptionResponse = { section: { title: string; html: string } };

export const ABOUT_REWARDS_TITLE = "About Rewards";

export function fetchNucleusList(skip: number, limit = NUCLEUS_PAGE_SIZE) {
  return apiRequest<NucleusListPage>(`/api/nucleus/projects?skip=${skip}&limit=${limit}`);
}

export function nucleusDetailParam(project: { id: string; slug: string | null }) {
  return project.slug || project.id;
}

export function fetchNucleusDetail(slug: string) {
  return apiRequest<NucleusDetailResponse>(`/api/nucleus/projects/${encodeURIComponent(slug)}`);
}

export function fetchNucleusDetailDescription(projectKey: string, title: string) {
  const params = new URLSearchParams({ title });
  return apiRequest<NucleusDetailDescriptionResponse>(`/api/nucleus/projects/${encodeURIComponent(projectKey)}/detail-description?${params}`);
}

export function isAboutRewardsTitle(title: string) {
  return title.trim().toLowerCase() === ABOUT_REWARDS_TITLE.toLowerCase();
}

export function nucleusListNextPageParam(lastPage: NucleusListPage, pages: NucleusListPage[]) {
  const loaded = pages.reduce((total, page) => total + page.projects.length, 0);
  return loaded < lastPage.count ? loaded : undefined;
}

export const nucleusCacheOptions = {
  staleTime: NUCLEUS_STALE_TIME,
  gcTime: NUCLEUS_GC_TIME,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export function prefetchNucleusList(queryClient: QueryClient) {
  return queryClient.prefetchInfiniteQuery({
    queryKey: nucleusKeys.list(),
    queryFn: ({ pageParam }) => fetchNucleusList(pageParam),
    initialPageParam: 0,
    getNextPageParam: nucleusListNextPageParam,
    ...nucleusCacheOptions,
  });
}

export function prefetchNucleusDetail(queryClient: QueryClient, slug: string) {
  return queryClient.prefetchQuery({
    queryKey: nucleusKeys.detail(slug),
    queryFn: () => fetchNucleusDetail(slug),
    ...nucleusCacheOptions,
  });
}
