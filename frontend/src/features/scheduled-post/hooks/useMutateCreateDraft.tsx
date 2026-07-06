import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataScheduledPost } from "../type";

type typeCreateDraftResponse = { data: typeDataScheduledPost };

export default function useMutateCreateDraft() {
  return useMutation({
    mutationFn: async (caption?: string) => {
      const response = await axiosInstanceAPI.request<typeCreateDraftResponse>({
        method: "POST",
        url: "/api/scheduled-posts",
        data: { caption },
      });
      return response.data;
    },
  });
}
