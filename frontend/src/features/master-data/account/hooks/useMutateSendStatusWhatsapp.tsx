import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

type typeDataSendStatusWhatsappResponse = {
  data: {
    sent: boolean;
  };
};

export default function useMutateSendStatusWhatsapp() {
  return useMutation({
    mutationFn: async () => {
      const response =
        await axiosInstanceAPI.request<typeDataSendStatusWhatsappResponse>({
          method: "POST",
          url: `/api/account/send-status-whatsapp`,
        });
      return response.data;
    },
  });
}
