import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataCreateBrandPayload } from "../type";

export default function useMutateAddBrand() {
  return useMutation({
    mutationFn: async (payload: typeDataCreateBrandPayload) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: "/api/brand",
        data: payload,
      });
      return response.data;
    },
  });
}
