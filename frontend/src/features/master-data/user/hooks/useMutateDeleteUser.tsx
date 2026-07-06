import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function useMutateDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstanceAPI.request({
        method: "DELETE",
        url: `/api/user/${id}`,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
