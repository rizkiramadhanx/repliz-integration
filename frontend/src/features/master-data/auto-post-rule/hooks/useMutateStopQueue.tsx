import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateStopQueue() {
  return useMutation({
    mutationFn: async () => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: "/api/auto-post-rule/queue-status/stop",
      });
      return response.data;
    },
  });
}
