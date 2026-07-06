import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type { typeDataScrapedPost } from "../type";

type typeDataScrapedPostListResponse = {
  data: typeDataScrapedPost[];
  meta: { page: number; limit: number; total: number; total_page: number };
};

export default function useGetScrapedPosts(batchJobId: string | null) {
  return useQuery({
    queryKey: ["scraped-posts", batchJobId],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataScrapedPostListResponse>({
          method: "GET",
          url: `/api/scrape-batches/${batchJobId}/posts`,
          params: { page: 1, limit: 100 },
        });
      return response;
    },
    enabled: !!batchJobId,
  });
}
