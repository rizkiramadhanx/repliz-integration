import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

type typeDataSendStatusEmailResponse = {
  data: {
    sent: boolean;
  };
};

export default function useMutateSendStatusEmail() {
  return useMutation({
    mutationFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataSendStatusEmailResponse>({
          method: "POST",
          url: `/api/account/send-status-email`,
        });
      return response.data;
    },
  });
}
