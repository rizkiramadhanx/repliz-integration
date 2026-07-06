import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";

type typeUploadScheduledMediaResult = {
  path: string;
  mediaType: "image" | "video";
};

type typeUploadScheduledMediaResponse = {
  data: typeUploadScheduledMediaResult;
};

export default function useMutateUploadScheduledMedia() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response =
        await axiosInstanceAPI.request<typeUploadScheduledMediaResponse>({
          method: "POST",
          url: "/api/scheduled-posts/upload-media",
          data: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });
      return response.data;
    },
  });
}
