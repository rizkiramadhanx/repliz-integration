import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateDeleteItem() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstanceAPI.request({
        method: "DELETE",
        url: `/api/item/${id}`,
      });
      return response.data;
    },
  });
}
