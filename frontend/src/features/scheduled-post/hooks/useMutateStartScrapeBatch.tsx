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
    }: {
      sourceAccountId: string;
      targetUsername: string;
      totalLimit: number;
    }) => {
      const response =
        await axiosInstanceAPI.request<typeStartScrapeBatchResponse>({
          method: "POST",
          url: "/api/scrape-batches",
          data: { sourceAccountId, targetUsername, totalLimit },
        });
      return response.data;
    },
  });
}
