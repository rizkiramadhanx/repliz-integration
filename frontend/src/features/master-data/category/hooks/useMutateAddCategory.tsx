import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataCreateCategoryPayload } from "../type";

export default function useMutateAddCategory() {
  return useMutation({
    mutationFn: async (payload: typeDataCreateCategoryPayload) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: "/api/category",
        data: payload,
      });
      return response.data;
    },
  });
}
