import { axiosInstanceAPI } from "@/libs/axios";
import type { typeDataCommonResponse } from "@/types/fetching";
import { useQuery } from "@tanstack/react-query";
import type { typeDataItem } from "../type";
import { isUndefined } from "@/utils/common-function";

type Params = {
  page?: number;
  limit?: number;
  keyword?: string;
};

export default function useGetAllItem({ page = 1, limit = 25, keyword = "" }: Params) {
  return useQuery({
    queryKey: ["item", page, limit, keyword],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataCommonResponse<typeDataItem[]>>({
        method: "GET",
        url: "/api/item",
        params: { page, limit, keyword: isUndefined(keyword) },
      });
      return response;
    },
  });
}
