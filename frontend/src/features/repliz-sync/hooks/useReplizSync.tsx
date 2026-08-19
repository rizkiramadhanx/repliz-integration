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
  });
}

export function useGetSyncedPost(ruleId?: string) {
  return useQuery({
    queryKey: ["repliz-synced-post", ruleId],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<{
        data: typeDataReplizSyncedPost[];
      }>({
        method: "GET",
        url: "/api/repliz-sync/synced-post",
        params: ruleId ? { ruleId } : undefined,
      });
      return response.data;
    },
  });
}

export type typeCreateSyncRulePayload = {
  label: string;
  targetUsername: string;
  replizAccountId: string;
  replizAccountLabel?: string;
  maxItems?: number;
  scheduleStartTime?: string;
  scheduleIntervalMinutes?: number;
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
