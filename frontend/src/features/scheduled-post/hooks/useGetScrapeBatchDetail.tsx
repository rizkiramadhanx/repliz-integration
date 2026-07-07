import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery, type QueryObserverOptions } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import type { typeDataScrapeBatchJob } from "../type";

type typeDataScrapeBatchDetailResponse = { data: typeDataScrapeBatchJob };

type typeQueryData = AxiosResponse<typeDataScrapeBatchDetailResponse>;

export default function useGetScrapeBatchDetail(
  batchJobId: string | null,
  options?: {
    refetchInterval?: QueryObserverOptions<typeQueryData>["refetchInterval"];
  },
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
