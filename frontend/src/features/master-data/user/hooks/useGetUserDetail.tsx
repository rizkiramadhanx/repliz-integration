import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type { typeDataUserDetail } from "../type";

type typeDataUserDetailResponse = {
  status: number;
  message: string;
  data: typeDataUserDetail;
};

export default function useGetUserDetail(userId: string | null) {
  return useQuery({
    queryKey: ["user", "detail", userId],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataUserDetailResponse>(
        {
          method: "GET",
          url: `/api/user/${userId}`,
        }
      );
      return response;
    },
    enabled: !!userId,
  });
}
