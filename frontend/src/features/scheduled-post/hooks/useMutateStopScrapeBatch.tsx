import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateStopScrapeBatch() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: `/api/scrape-batches/${id}/stop`,
      });
      return response.data;
    },
  });
}
