import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export default function useMutateStopBlast() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstanceAPI.request({
        method: "POST",
        url: `/api/blast-jobs/${id}/stop`,
      });
      return response.data;
    },
  });
}
