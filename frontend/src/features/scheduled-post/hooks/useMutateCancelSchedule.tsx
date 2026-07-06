import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataScheduledPost } from "../type";

type typeCancelResponse = { data: typeDataScheduledPost };

export default function useMutateCancelSchedule() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstanceAPI.request<typeCancelResponse>({
        method: "POST",
        url: `/api/scheduled-posts/${id}/cancel`,
      });
      return response.data;
    },
  });
}
