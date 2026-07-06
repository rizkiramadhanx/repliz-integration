import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type { typeDataAccount } from "../type";
import { isUndefined } from "@/utils/common-function";

type typeDataGetAllAccountParams = {
  page?: number;
  limit?: number;
  keyword?: string;
};

type typeDataAccountListResponse = {
  data: typeDataAccount[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_page: number;
  };
};

export default function useGetAllAccount({
  page = 1,
  limit = 25,
  keyword = "",
}: typeDataGetAllAccountParams) {
  return useQuery({
    queryKey: ["account", page, limit, keyword],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataAccountListResponse>({
          method: "GET",
          url: "/api/account",
          params: { page, limit, keyword: isUndefined(keyword) },
        });

      return response;
    },
  });
}
