import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataUpdateBrandPayload } from "../type";

export default function useMutateEditBrand() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeDataUpdateBrandPayload }) => {
      const response = await axiosInstanceAPI.request({
        method: "PATCH",
        url: `/api/brand/${id}`,
        data: payload,
      });
      return response.data;
    },
  });
}
