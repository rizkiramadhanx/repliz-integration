import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataScheduledPost } from "../type";

type typeScheduleResponse = { data: typeDataScheduledPost };

export default function useMutateSchedulePost() {
  return useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: string }) => {
      const response = await axiosInstanceAPI.request<typeScheduleResponse>({
        method: "POST",
        url: `/api/scheduled-posts/${id}/schedule`,
        data: { scheduledAt },
      });
      return response.data;
    },
  });
}
