import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeDataBlastJob } from "../type";

type typeStartBlastResponse = { data: typeDataBlastJob };

export default function useMutateStartBlast() {
  return useMutation({
    mutationFn: async ({
      facebookAccountId,
      mediaPath,
      caption,
      groupIds,
      gapMinutes,
      scheduledAt,
    }: {
      facebookAccountId: string;
      mediaPath?: string;
      caption: string;
      groupIds: string[];
      gapMinutes: number;
      scheduledAt?: string;
    }) => {
      const response = await axiosInstanceAPI.request<typeStartBlastResponse>(
        {
          method: "POST",
          url: "/api/blast-jobs",
          data: {
            facebookAccountId,
            mediaPath,
            caption,
            groupIds,
            gapMinutes,
            scheduledAt,
          },
        },
      );
      return response.data;
    },
  });
}
