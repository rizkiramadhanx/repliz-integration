import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type { typeDataRole } from "../type";

type typeDataRoleDetailResponse = {
  data: typeDataRole[];
};

export default function useGetRoleDetail(roleId: string | null) {
  return useQuery({
    queryKey: ["role", "detail", roleId],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataRoleDetailResponse>({
        method: "GET",
        url: `/api/role/${roleId}`,
      });
      return response.data;
    },
    enabled: !!roleId,
  });
}
