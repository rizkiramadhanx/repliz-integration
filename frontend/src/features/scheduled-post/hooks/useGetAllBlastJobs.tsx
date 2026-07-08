import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery, type QueryObserverOptions } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import type { typeDataBlastJob } from "../type";

type typeDataBlastJobListResponse = {
  data: typeDataBlastJob[];
  meta: { page: number; limit: number; total: number; total_page: number };
};

type typeQueryData = AxiosResponse<typeDataBlastJobListResponse>;

export default function useGetAllBlastJobs(
  { page = 1, limit = 10 }: { page?: number; limit?: number } = {},
  options?: {
    refetchInterval?: QueryObserverOptions<typeQueryData>["refetchInterval"];
  },
) {
  return useQuery({
    queryKey: ["blast-jobs", page, limit],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataBlastJobListResponse>({
          method: "GET",
          url: "/api/blast-jobs",
          params: { page, limit },
        });
      return response;
    },
    refetchInterval: options?.refetchInterval,
  });
}
