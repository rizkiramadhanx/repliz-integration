import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateRunNowAutoPostRule() {
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: `/api/auto-post-rule/${ruleId}/run-now`,
      });
      return response.data;
    },
  });
}
