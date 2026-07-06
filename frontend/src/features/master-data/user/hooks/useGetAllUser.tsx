import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type { typeDataUserListResponse } from "../type";
import { isUndefined } from "@/utils/common-function";

type typeDataGetAllUserParams = {
  page?: number;
  limit?: number;
  keyword?: string;
};

export default function useGetAllUser({
  page = 1,
  limit = 25,
  keyword = "",
}: typeDataGetAllUserParams) {
  return useQuery<typeDataUserListResponse>({
    queryKey: ["user", page, limit, keyword],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataUserListResponse>({
        method: "GET",
        url: "/api/user",
        params: { page, limit, keyword: isUndefined(keyword) },
      });
      return response.data;
    },
  });
}
