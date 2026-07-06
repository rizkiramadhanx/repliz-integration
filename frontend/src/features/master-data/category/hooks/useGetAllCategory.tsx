import { axiosInstanceAPI } from "@/libs/axios";
import type { typeDataCommonResponse } from "@/types/fetching";
import { useQuery } from "@tanstack/react-query";
import type { typeDataCategory } from "../type";
import { isUndefined } from "@/utils/common-function";

type Params = {
  page?: number;
  limit?: number;
  keyword?: string;
};

export default function useGetAllCategory({ page = 1, limit = 25, keyword = "" }: Params) {
  return useQuery({
    queryKey: ["category", page, limit, keyword],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataCommonResponse<typeDataCategory[]>>({
        method: "GET",
        url: "/api/category",
        params: { page, limit, keyword: isUndefined(keyword) },
      });
      return response;
    },
  });
}
