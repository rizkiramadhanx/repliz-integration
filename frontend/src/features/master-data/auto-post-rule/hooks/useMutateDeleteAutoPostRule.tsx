import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateDeleteAutoPostRule() {
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await axiosInstanceAPI.request({
        method: "DELETE",
        url: `/api/auto-post-rule/${ruleId}`,
      });
      return response.data;
    },
  });
}
