import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateDeleteRole() {
  return useMutation({
    mutationFn: async (roleId: string) => {
      const response = await axiosInstanceAPI.request({
        method: "DELETE",
        url: `/api/role/${roleId}`,
      });
      return response.data;
    },
  });
}
