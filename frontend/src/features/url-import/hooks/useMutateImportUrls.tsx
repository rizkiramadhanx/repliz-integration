import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation, useQuery } from "@tanstack/react-query";

export type typeImportUrlResult = {
  url: string;
  ok: boolean;
  scheduleId?: string;
  scheduledAt?: string;
  caption?: string;
  error?: string;
  duplicate?: boolean;
  previousScheduledAt?: string;
};

export type typeImportUrlsPayload = {
  urls: string;
  replizAccountId: string;
  startDate?: string;
  startTime?: string;
  autoAddMusic?: boolean;
  intervalMinutes?: number;
  postType?: "video" | "reels" | "story";
  timezoneOffsetMinutes?: number;
};

export type typeImportJob = {
  id: string;
  replizAccountId: string;
  replizAccountName: string | null;
  status: "running" | "done" | "failed" | "canceled";
  total: number;
  processed: number;
  success: number;
  failed: number;
  message: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type typeImportHistoryRow = {
  id: string;
  url: string;
  replizAccountId: string;
  replizScheduleId: string | null;
  scheduledAt: string | null;
  jobId: string | null;
  status: "scheduled" | "failed";
  errorMessage: string | null;
  postType: string | null;
  mediaCount: number;
  mediaUrls: string[] | null;
  caption: string | null;
  createdAt: string;
};

type typeMeta = {
  page: number;
  limit: number;
  total: number;
  total_page: number;
};

// Impor kini fire-and-forget: response hanya berisi jobId, kemajuannya
// dipantau lewat useGetImportJob.
export default function useMutateImportUrls() {
  return useMutation({
    mutationFn: async (payload: typeImportUrlsPayload) => {
      const response = await axiosInstanceAPI.request<{
        message: string;
        data: { jobId: string; total: number };
      }>({
        method: "POST",
        url: "/api/repliz-sync/import-urls",
        data: payload,
      });
      return response.data;
    },
  });
}

export function useGetImportJob(page = 1, limit = 10) {
  return useQuery({
    queryKey: ["url-import-job", page, limit],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<{
        data: { data: typeImportJob[]; meta: typeMeta };
      }>({
        method: "GET",
        url: "/api/repliz-sync/import-job",
        params: { page, limit },
      });
      return response.data;
    },
    // Selama ada job berjalan, daftar disegarkan berkala; begitu semua
    // selesai polling berhenti sendiri agar tidak membebani server.
    refetchInterval: (query) => {
      const jobs = query.state.data?.data?.data ?? [];
      return jobs.some((job) => job.status === "running") ? 3000 : false;
    },
  });
}

export type typeImportHistoryFilter = {
  jobId?: string;
  replizAccountId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export function useGetImportHistory(filter: typeImportHistoryFilter = {}) {
  return useQuery({
    queryKey: ["url-import-history", filter],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<{
        data: { data: typeImportHistoryRow[]; meta: typeMeta };
      }>({
        method: "GET",
        url: "/api/repliz-sync/import-history",
        params: filter,
      });
      return response.data;
    },
  });
}

export function useMutateRetryImportJob() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await axiosInstanceAPI.request<{
        message: string;
        data: { jobId: string; total: number };
      }>({
        method: "POST",
        url: `/api/repliz-sync/import-job/${jobId}/retry`,
      });
      return response.data;
    },
  });
}

export type typeMediaCleanupPreview = {
  totalFiles: number;
  totalBytes: number;
  staleFiles: number;
  staleBytes: number;
  keptInUse: number;
  cutoff: string;
  files: { filename: string; bytes: number; modifiedAt: string }[];
};

export function useGetMediaCleanupPreview() {
  return useQuery({
    queryKey: ["media-cleanup-preview"],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<{
        data: typeMediaCleanupPreview;
      }>({
        method: "GET",
        url: "/api/repliz-sync/media-cleanup",
      });
      return response.data;
    },
  });
}

export function useMutateMediaCleanup() {
  return useMutation({
    mutationFn: async () => {
      const response = await axiosInstanceAPI.request<{
        message: string;
        data: { deleted: number; bytesFreed: number; failed: string[] };
      }>({
        method: "DELETE",
        url: "/api/repliz-sync/media-cleanup",
      });
      return response.data;
    },
  });
}
