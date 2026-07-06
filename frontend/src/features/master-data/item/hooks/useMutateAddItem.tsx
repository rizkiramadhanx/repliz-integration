import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataCreateItemPayload } from "../type";

export default function useMutateAddItem() {
  return useMutation({
    mutationFn: async (payload: typeDataCreateItemPayload) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: "/api/item",
        data: payload,
      });
      return response.data;
    },
  });
}
