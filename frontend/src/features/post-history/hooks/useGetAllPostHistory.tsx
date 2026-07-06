import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import { isUndefined } from "@/utils/common-function";
import type { typeDataPostHistoryListResponse } from "../type";

type typeDataGetAllPostHistoryParams = {
  page?: number;
  limit?: number;
  ruleId?: string;
  status?: string;
  platform?: string;
};

export default function useGetAllPostHistory({
  page = 1,
  limit = 25,
  ruleId = "",
  status = "",
  platform = "",
}: typeDataGetAllPostHistoryParams) {
  return useQuery({
    queryKey: ["post-history", page, limit, ruleId, status, platform],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataPostHistoryListResponse>({
          method: "GET",
          url: "/api/post-history",
          params: {
            page,
            limit,
            ruleId: isUndefined(ruleId),
            status: isUndefined(status),
            platform: isUndefined(platform),
          },
        });

      return response;
    },
  });
}
