import { axiosInstanceAPI } from "@/libs/axios";
import { useMutation } from "@tanstack/react-query";
import type { typeAutoPostTemplateMediaType } from "../type";

type typeUploadTemplateMediaResult = {
  path: string;
  mediaType: typeAutoPostTemplateMediaType;
};

type typeUploadTemplateMediaResponse = {
  data: typeUploadTemplateMediaResult;
};

type typeUploadTemplateMediaVariables = {
  file: File;
  onUploadProgress?: (percent: number) => void;
};

export default function useMutateUploadTemplateMedia() {
  return useMutation({
    mutationFn: async ({
      file,
      onUploadProgress,
    }: typeUploadTemplateMediaVariables) => {
      const formData = new FormData();
      formData.append("file", file);

      const response =
        await axiosInstanceAPI.request<typeUploadTemplateMediaResponse>({
          method: "POST",
          url: "/api/auto-post-rule/upload-template-media",
          data: formData,
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (!onUploadProgress || !event.total) return;
            onUploadProgress(Math.round((event.loaded / event.total) * 100));
          },
        });
      return response.data;
    },
  });
}
