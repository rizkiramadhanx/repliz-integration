import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  typeDataReplizSyncRule,
  typeDataReplizSyncedPost,
  typeDataRunRuleResult,
} from "../type";

export function useGetAllSyncRule() {
  return useQuery({
    queryKey: ["repliz-sync-rule"],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<{
        data: typeDataReplizSyncRule[];
      }>({ method: "GET", url: "/api/repliz-sync/rule" });
      return response.data;
    },
    // Endpoint jalankan bersifat fire-and-forget, jadi kemajuan tidak datang
    // dari response-nya. Selama masih ada rule berstatus 'running', daftar
    // di-refresh berkala; begitu semua selesai polling berhenti sendiri agar
    // tidak membebani server tanpa alasan.
    refetchInterval: (query) => {
      const rules = query.state.data?.data ?? [];
      return rules.some((rule) => rule.lastRunStatus === "running")
        ? 5000
        : false;
    },
  });
}

export type typeSyncedPostFilter = {
  ruleId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export function useGetSyncedPost(filter: typeSyncedPostFilter = {}) {
  const { ruleId, status, dateFrom, dateTo, page = 1, limit = 25 } = filter;

  return useQuery({
    queryKey: [
      "repliz-synced-post",
      ruleId,
      status,
      dateFrom,
      dateTo,
      page,
      limit,
    ],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<{
        data: {
          data: typeDataReplizSyncedPost[];
          meta: {
            page: number;
            limit: number;
            total: number;
            total_page: number;
          };
        };
      }>({
        method: "GET",
        url: "/api/repliz-sync/synced-post",
        params: {
          page,
          limit,
          ...(ruleId ? { ruleId } : {}),
          ...(status ? { status } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        },
      });
      return response.data;
    },
  });
}

export type typeCreateSyncRulePayload = {
  label: string;
  targetUsernames: string[];
  replizAccountId: string;
  replizAccountLabel?: string;
  maxItems?: number;
  scrapeTime?: string;
  scheduleStartTime?: string;
  scheduleIntervalMinutes?: number;
  sourcePlatform?: "instagram" | "facebook";
  scrapeMode?: "posts" | "reels";
  status?: "active" | "paused";
};

export function useMutateCreateSyncRule() {
  return useMutation({
    mutationFn: async (payload: typeCreateSyncRulePayload) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: "/api/repliz-sync/rule",
        data: payload,
      });
      return response.data;
    },
  });
}

export function useMutateUpdateSyncRule() {
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<typeCreateSyncRulePayload> & { id: string }) => {
      const response = await axiosInstanceAPI.request({
        method: "PATCH",
        url: `/api/repliz-sync/rule/${id}`,
        data: payload,
      });
      return response.data;
    },
  });
}

export function useMutateDeleteSyncRule() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstanceAPI.request({
        method: "DELETE",
        url: `/api/repliz-sync/rule/${id}`,
      });
      return response.data;
    },
  });
}

export type typeDeleteSyncedPostPayload = {
  ids?: string[];
  ruleId?: string;
  all?: boolean;
  alsoDeleteOnRepliz?: boolean;
};

export function useMutateDeleteSyncedPost() {
  return useMutation({
    mutationFn: async (payload: typeDeleteSyncedPostPayload) => {
      const response = await axiosInstanceAPI.request<{
        message: string;
        data: {
          deleted: number;
          deletedOnRepliz: number;
          replizError: string | null;
        };
      }>({
        method: "DELETE",
        url: "/api/repliz-sync/synced-post",
        data: payload,
      });
      return response.data;
    },
  });
}

export function useMutateRunSyncRule() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstanceAPI.request<{
        data: typeDataRunRuleResult;
        message: string;
      }>({ method: "POST", url: `/api/repliz-sync/rule/${id}/run` });
      return response.data;
    },
  });
}
