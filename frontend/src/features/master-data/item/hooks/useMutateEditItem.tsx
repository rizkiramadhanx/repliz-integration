import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataUpdateItemPayload } from "../type";

export default function useMutateEditItem() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeDataUpdateItemPayload }) => {
      const response = await axiosInstanceAPI.request({
        method: "PATCH",
        url: `/api/item/${id}`,
        data: payload,
      });
      return response.data;
    },
  });
}
