import { axiosInstanceAPI } from "@/libs/axios";
import type {
  typeDataLogin,
  TypeDataResponseLogin,
} from "@/features/authentication/login/type";
import { useMutation } from "@tanstack/react-query";
import { AxiosResponse } from "axios";

export default function useMutateLogin() {
  return useMutation<
    AxiosResponse<TypeDataResponseLogin>,
    Error,
    typeDataLogin
  >({
    mutationFn: async (dataForm) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: "api/auth/login",
        data: dataForm,
      });
      return response;
    },
  });
}
