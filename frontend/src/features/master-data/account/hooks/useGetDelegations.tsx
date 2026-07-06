import { axiosInstanceAPI } from "@/libs/axios";
import { useQuery } from "@tanstack/react-query";
import type { typeDataDelegation } from "../type";

type typeDataDelegationListResponse = {
  data: typeDataDelegation[];
};

export default function useGetDelegations(accountId: string | null) {
  return useQuery({
    queryKey: ["account", accountId, "delegations"],
    queryFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataDelegationListResponse>({
          method: "GET",
          url: `/api/account/${accountId}/delegations`,
        });
      return response.data;
    },
    enabled: !!accountId,
  });
}
