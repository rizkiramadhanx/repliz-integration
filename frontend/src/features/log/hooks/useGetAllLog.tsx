import { axiosInstanceAPI } from "@/libs/axios";
import { isUndefined } from "@/utils/common-function";
import { useQuery } from "@tanstack/react-query";
import type { typeDataLogListResponse } from "../type";

type typeDataGetAllLogParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  action?: string;
  user_id?: string;
  status?: string;
};

export default function useGetAllLog({
  page = 1,
  limit = 25,
  keyword = "",
  action = "",
  user_id = "",
  status = "",
}: typeDataGetAllLogParams) {
  return useQuery({
    queryKey: ["log", page, limit, keyword, action, user_id, status],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataLogListResponse>({
        method: "GET",
        url: "/api/log",
        params: {
          page,
          limit,
          keyword: isUndefined(keyword),
          action: isUndefined(action),
          user_id: isUndefined(user_id),
          status: isUndefined(status),
        },
      });
      return response;
    },
  });
}
