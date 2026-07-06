import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type {
  typeDataAutoPostRule,
  typeDataUpdateAutoPostRulePayload,
} from "../type";

type typeDataUpdateAutoPostRuleResponse = {
  data: typeDataAutoPostRule;
};

export default function useMutateEditAutoPostRule() {
  return useMutation({
    mutationFn: async ({
      ruleId,
      payload,
    }: {
      ruleId: string;
      payload: typeDataUpdateAutoPostRulePayload;
    }) => {
      const response =
        await axiosInstanceAPI.request<typeDataUpdateAutoPostRuleResponse>({
          method: "PATCH",
          url: `/api/auto-post-rule/${ruleId}`,
          data: payload,
        });
      return response.data;
    },
  });
}
