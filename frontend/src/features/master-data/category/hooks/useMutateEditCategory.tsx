import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataUpdateCategoryPayload } from "../type";

export default function useMutateEditCategory() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeDataUpdateCategoryPayload }) => {
      const response = await axiosInstanceAPI.request({
        method: "PATCH",
        url: `/api/category/${id}`,
        data: payload,
      });
      return response.data;
    },
  });
}
