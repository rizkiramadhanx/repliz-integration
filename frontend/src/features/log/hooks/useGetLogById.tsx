import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type { typeDataLogDetailResponse } from "../type";

export default function useGetLogById(logId: string | null) {
  return useQuery({
    queryKey: ["log", logId],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataLogDetailResponse>({
        method: "GET",
        url: `/api/log/${logId}`,
      });
      return response;
    },
    enabled: !!logId,
  });
}
