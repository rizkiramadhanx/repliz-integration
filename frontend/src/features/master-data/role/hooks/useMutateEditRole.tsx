import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataRole, typeDataUpdateRolePayload } from "../type";

type typeDataUpdateRoleResponse = {
  data: typeDataRole;
};

export default function useMutateEditRole() {
  return useMutation({
    mutationFn: async ({
      roleId,
      payload,
    }: {
      roleId: string;
      payload: typeDataUpdateRolePayload;
    }) => {
      const response =
        await axiosInstanceAPI.request<typeDataUpdateRoleResponse>({
          method: "PATCH",
          url: `/api/role/${roleId}`,
          data: payload,
        });
      return response.data;
    },
  });
}
