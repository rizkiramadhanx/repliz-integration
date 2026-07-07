import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataScrapeBatchJob } from "../type";

type typeStartScrapeBatchResponse = { data: typeDataScrapeBatchJob };

export default function useMutateStartScrapeBatch() {
  return useMutation({
    mutationFn: async ({
      sourceAccountId,
      targetUsername,
      totalLimit,
      scrapeMode,
    }: {
      sourceAccountId: string;
      targetUsername: string;
      totalLimit: number;
      scrapeMode?: "posts" | "reels";
    }) => {
      const response =
        await axiosInstanceAPI.request<typeStartScrapeBatchResponse>({
          method: "POST",
          url: "/api/scrape-batches",
          data: { sourceAccountId, targetUsername, totalLimit, scrapeMode },
        });
      return response.data;
    },
  });
}
