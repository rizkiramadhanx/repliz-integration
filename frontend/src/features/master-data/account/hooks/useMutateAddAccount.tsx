import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataAccount, typeDataCreateAccountPayload } from "../type";

type typeDataCreateAccountResponse = {
  data: typeDataAccount;
};

export default function useMutateAddAccount() {
  return useMutation({
    mutationFn: async (payload: typeDataCreateAccountPayload) => {
      const response =
        await axiosInstanceAPI.request<typeDataCreateAccountResponse>({
          method: "POST",
          url: "/api/account",
          data: payload,
        });
      return response.data;
    },
  });
}
