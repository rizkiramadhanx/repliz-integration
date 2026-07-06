import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateGenerateDraftsFromScrape() {
  return useMutation({
    mutationFn: async ({
      batchJobId,
      scrapedPostIds,
      targetAccountIds,
      gapMinutes,
    }: {
      batchJobId: string;
      scrapedPostIds: string[];
      targetAccountIds: string[];
      gapMinutes: number;
    }) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: `/api/scrape-batches/${batchJobId}/generate-drafts`,
        data: { scrapedPostIds, targetAccountIds, gapMinutes },
      });
      return response.data;
    },
  });
}
