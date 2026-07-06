import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type {
  typeDataAutoPostRule,
  typeDataCreateAutoPostRulePayload,
} from "../type";

type typeDataCreateAutoPostRuleResponse = {
  data: typeDataAutoPostRule;
};

export default function useMutateAddAutoPostRule() {
  return useMutation({
    mutationFn: async (payload: typeDataCreateAutoPostRulePayload) => {
      const response =
        await axiosInstanceAPI.request<typeDataCreateAutoPostRuleResponse>({
          method: "POST",
          url: "/api/auto-post-rule",
          data: payload,
        });
      return response.data;
    },
  });
}
