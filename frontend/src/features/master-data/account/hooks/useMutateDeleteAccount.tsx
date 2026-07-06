import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateDeleteAccount() {
  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await axiosInstanceAPI.request({
        method: "DELETE",
        url: `/api/account/${accountId}`,
      });
      return response.data;
    },
  });
}
