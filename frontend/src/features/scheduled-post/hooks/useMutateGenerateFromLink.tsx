import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataScheduledPost } from "../type";

type typeGenerateFromLinkResponse = { data: typeDataScheduledPost };

export default function useMutateGenerateFromLink() {
  return useMutation({
    mutationFn: async ({
      sourceAccountId,
      sourceUrl,
    }: {
      sourceAccountId: string;
      sourceUrl: string;
    }) => {
      const response =
        await axiosInstanceAPI.request<typeGenerateFromLinkResponse>({
          method: "POST",
          url: "/api/scheduled-posts/generate-from-link",
          data: { sourceAccountId, sourceUrl },
        });
      return response.data;
    },
  });
}
