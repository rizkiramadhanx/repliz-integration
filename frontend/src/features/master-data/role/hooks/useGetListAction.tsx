import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type { typeDataRoleListActionItem } from "../type";

type typeDataListActionResponse = {
  data: typeDataRoleListActionItem[];
};

export default function useGetListAction() {
  return useQuery({
    queryKey: ["role", "list-action"],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataListActionResponse>({
        method: "GET",
        url: "/api/role/list-action",
      });
      return response.data;
    },
  });
}
