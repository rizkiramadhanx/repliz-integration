import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { typeDataCreateUserPayload } from "../type";

export default function useMutateAddUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: typeDataCreateUserPayload) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: "/api/user",
        data: payload,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
