import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

type typeDataCheckConnectionResponse = {
  data: {
    ok: boolean;
    error?: string;
    username?: string;
  };
};

export default function useMutateCheckConnection() {
  return useMutation({
    mutationFn: async (accountId: string) => {
      const response =
        await axiosInstanceAPI.request<typeDataCheckConnectionResponse>({
          method: "POST",
          url: `/api/account/${accountId}/check-connection`,
        });
      return response.data;
    },
  });
}
