import { axiosInstanceAPI } from "@/libs/axios";
import type { typeDataCommonResponse } from "@/types/fetching";
import { useQuery } from "@tanstack/react-query";
import type { typeDataBrand } from "../type";
import { isUndefined } from "@/utils/common-function";

type Params = {
  page?: number;
  limit?: number;
  keyword?: string;
};

export default function useGetAllBrand({ page = 1, limit = 25, keyword = "" }: Params) {
  return useQuery({
    queryKey: ["brand", page, limit, keyword],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataCommonResponse<typeDataBrand[]>>({
        method: "GET",
        url: "/api/brand",
        params: { page, limit, keyword: isUndefined(keyword) },
      });
      return response;
    },
  });
}
