import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataDelegatePayload } from "../type";

export default function useMutateDelegateAccount() {
  return useMutation({
    mutationFn: async ({
      accountId,
      payload,
    }: {
      accountId: string;
      payload: typeDataDelegatePayload;
    }) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: `/api/account/${accountId}/delegations`,
        data: payload,
      });
      return response.data;
    },
  });
}
