import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

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
};

export default function useMutateImportUrls() {
  return useMutation({
    mutationFn: async (payload: typeImportUrlsPayload) => {
      const response = await axiosInstanceAPI.request<{
        message: string;
        data: {
          results: typeImportUrlResult[];
          total: number;
          success: number;
        };
      }>({
        method: "POST",
        url: "/api/repliz-sync/import-urls",
        data: payload,
      });
      return response.data;
    },
  });
}
