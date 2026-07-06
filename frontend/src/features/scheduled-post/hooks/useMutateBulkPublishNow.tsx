import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeBulkActionResult } from "../type";

type typeBulkResponse = { data: typeBulkActionResult };

export default function useMutateBulkPublishNow() {
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await axiosInstanceAPI.request<typeBulkResponse>({
        method: "POST",
        url: "/api/scheduled-posts/bulk-publish-now",
        data: { ids },
      });
      return response.data;
    },
  });
}
