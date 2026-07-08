import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

export type typeFacebookGroup = {
  id: string;
  name: string;
};

type typeListFacebookGroupsResponse = {
  data: typeFacebookGroup[];
};

export default function useMutateListFacebookGroups() {
  return useMutation({
    mutationFn: async (accountId: string) => {
      const response =
        await axiosInstanceAPI.request<typeListFacebookGroupsResponse>({
          method: "POST",
          url: `/api/account/${accountId}/facebook/my-groups`,
        });
      return response.data;
    },
  });
}
