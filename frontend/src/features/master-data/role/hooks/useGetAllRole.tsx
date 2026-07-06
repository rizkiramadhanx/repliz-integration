import { axiosInstanceAPI } from "@/libs/axios";
import type { typeDataCommonResponse } from "@/types/fetching";
import { useQuery } from "@tanstack/react-query";
import type { typeDataRole } from "../type";
import { isUndefined } from "@/utils/common-function";

type typeDataGetAllRoleParams = {
  page?: number;
  limit?: number;
  keyword?: string;
};

export default function useGetAllRole({
  page = 1,
  limit = 25,
  keyword = "",
}: typeDataGetAllRoleParams) {
  return useQuery({
    queryKey: ["role", page, limit, keyword],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<
        typeDataCommonResponse<typeDataRole[]>
      >({
        method: "GET",
        url: "/api/role",
        params: { page, limit, keyword: isUndefined(keyword) },
      });

      return response;
    },
  });
}
