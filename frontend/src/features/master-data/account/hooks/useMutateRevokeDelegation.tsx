import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateRevokeDelegation() {
  return useMutation({
    mutationFn: async ({
      accountId,
      delegationId,
    }: {
      accountId: string;
      delegationId: string;
    }) => {
      const response = await axiosInstanceAPI.request({
        method: "DELETE",
        url: `/api/account/${accountId}/delegations/${delegationId}`,
      });
      return response.data;
    },
  });
}
