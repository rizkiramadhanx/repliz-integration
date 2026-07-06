import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import { isUndefined } from "@/utils/common-function";
import type { typeDataAutoPostRule } from "../type";

type typeDataGetAllAutoPostRuleParams = {
  page?: number;
  limit?: number;
  keyword?: string;
};

type typeDataAutoPostRuleListResponse = {
  data: typeDataAutoPostRule[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_page: number;
  };
};

export default function useGetAllAutoPostRule({
  page = 1,
  limit = 25,
  keyword = "",
}: typeDataGetAllAutoPostRuleParams) {
  return useQuery({
    queryKey: ["auto-post-rule", page, limit, keyword],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataAutoPostRuleListResponse>({
          method: "GET",
          url: "/api/auto-post-rule",
          params: { page, limit, keyword: isUndefined(keyword) },
        });

      return response;
    },
  });
}
