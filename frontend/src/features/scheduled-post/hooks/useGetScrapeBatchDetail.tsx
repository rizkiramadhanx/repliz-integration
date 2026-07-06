import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type { typeDataScrapeBatchJob } from "../type";

type typeDataScrapeBatchDetailResponse = { data: typeDataScrapeBatchJob };

export default function useGetScrapeBatchDetail(
  batchJobId: string | null,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: ["scrape-batch-detail", batchJobId],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataScrapeBatchDetailResponse>({
          method: "GET",
          url: `/api/scrape-batches/${batchJobId}`,
        });
      return response;
    },
    enabled: !!batchJobId,
    refetchInterval: options?.refetchInterval,
  });
}
