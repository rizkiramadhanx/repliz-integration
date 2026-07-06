import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { typeDataUpdateUserPayload } from "../type";

export default function useMutateEditUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: typeDataUpdateUserPayload & { id: string }) => {
      const body: Record<string, unknown> = { ...payload };
      if (body.password === "" || body.password === undefined) {
        delete body.password;
      }
      const response = await axiosInstanceAPI.request({
        method: "PUT",
        url: `/api/user/${id}`,
        data: body,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
