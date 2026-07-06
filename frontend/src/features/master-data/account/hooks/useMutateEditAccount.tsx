import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataAccount, typeDataUpdateAccountPayload } from "../type";

type typeDataUpdateAccountResponse = {
  data: typeDataAccount;
};

export default function useMutateEditAccount() {
  return useMutation({
    mutationFn: async ({
      accountId,
      payload,
    }: {
      accountId: string;
      payload: typeDataUpdateAccountPayload;
    }) => {
      const response =
        await axiosInstanceAPI.request<typeDataUpdateAccountResponse>({
          method: "PATCH",
          url: `/api/account/${accountId}`,
          data: payload,
        });
      return response.data;
    },
  });
}
