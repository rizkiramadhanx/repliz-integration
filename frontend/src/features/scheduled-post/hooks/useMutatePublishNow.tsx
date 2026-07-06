import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutatePublishNow() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: `/api/scheduled-posts/${id}/publish-now`,
      });
      return response.data;
    },
  });
}
