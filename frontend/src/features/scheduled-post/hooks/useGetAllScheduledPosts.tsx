import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import { isUndefined } from "@/utils/common-function";
import type { typeDataGetAllScheduledPostsParams, typeDataScheduledPost } from "../type";

type typeDataScheduledPostListResponse = {
  data: typeDataScheduledPost[];
  meta: { page: number; limit: number; total: number; total_page: number };
};

export default function useGetAllScheduledPosts({
  page = 1,
  limit = 25,
  startDate = "",
  endDate = "",
}: typeDataGetAllScheduledPostsParams & { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ["scheduled-post", page, limit, startDate, endDate],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataScheduledPostListResponse>({
          method: "GET",
          url: "/api/scheduled-posts",
          params: {
            page,
            limit,
            startDate: isUndefined(startDate),
            endDate: isUndefined(endDate),
          },
        });
      return response;
    },
  });
}
