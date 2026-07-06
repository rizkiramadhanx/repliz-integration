import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataCreateRolePayload, typeDataRole } from "../type";

type typeDataCreateRoleResponse = {
  data: typeDataRole;
};

export default function useMutateAddRole() {
  return useMutation({
    mutationFn: async (payload: typeDataCreateRolePayload) => {
      const response = await axiosInstanceAPI.request<typeDataCreateRoleResponse>({
        method: "POST",
        url: "/api/role",
        data: payload,
      });
      return response.data;
    },
  });
}
