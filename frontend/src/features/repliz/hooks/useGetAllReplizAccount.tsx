import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type {
  typeDataReplizAccount,
  typeDataReplizPaginated,
} from "../type";

type typeDataGetAllReplizAccountParams = {
  page?: number;
  limit?: number;
  search?: string;
};

type typeDataReplizAccountListResponse = {
  data: typeDataReplizPaginated<typeDataReplizAccount>;
};

export default function useGetAllReplizAccount({
  page = 1,
  limit = 25,
  search = "",
}: typeDataGetAllReplizAccountParams) {
  return useQuery({
    queryKey: ["repliz-account", page, limit, search],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataReplizAccountListResponse>({
          method: "GET",
          url: "/api/repliz/account",
          params: { page, limit, ...(search ? { search } : {}) },
        });

      return response;
    },
  });
}
