import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataScheduledPost } from "../type";

type typeUpdateDraftResponse = { data: typeDataScheduledPost };

type typeUpdateDraftVariables = {
  id: string;
  caption?: string;
  targetAccountIds?: string[];
  media?: File | null;
};

export default function useMutateUpdateDraft() {
  return useMutation({
    mutationFn: async ({ id, caption, targetAccountIds, media }: typeUpdateDraftVariables) => {
      const formData = new FormData();
      if (caption !== undefined) formData.append("caption", caption);
      if (targetAccountIds !== undefined) {
        formData.append("targetAccountIds", JSON.stringify(targetAccountIds));
      }
      if (media) formData.append("media", media);

      const response = await axiosInstanceAPI.request<typeUpdateDraftResponse>({
        method: "PATCH",
        url: `/api/scheduled-posts/${id}`,
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
  });
}
