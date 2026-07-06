import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";

type typeDataQueueStatus = {
  waiting: number;
  active: number;
  delayed: number;
  total: number;
};

type typeDataQueueStatusResponse = {
  data: typeDataQueueStatus;
};

export default function useGetQueueStatus() {
  return useQuery({
    queryKey: ["auto-post-rule", "queue-status"],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataQueueStatusResponse>({
          method: "GET",
          url: "/api/auto-post-rule/queue-status",
        });
      return response.data;
    },
    refetchInterval: 5000,
  });
}
