import { useState } from "react";
import {
  FileInput,
  Image,
  Progress,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import useMutateUploadTemplateMedia from "../hooks/useMutateUploadTemplateMedia";
import type { typeAutoPostTemplateMediaType } from "../type";

export type TemplateFieldsValue = {
  templateMediaPath?: string;
  templateMediaType?: typeAutoPostTemplateMediaType;
  templateCaption: string;
};

export default function TemplateFields({
  value,
  onChange,
}: {
  value: TemplateFieldsValue;
  onChange: (next: TemplateFieldsValue) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { mutate: uploadMedia, isPending: isUploading } =
    useMutateUploadTemplateMedia();
  const [progress, setProgress] = useState(0);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setProgress(0);

    uploadMedia(
      { file, onUploadProgress: setProgress },
      {
        onSuccess: (res) => {
          onChange({
            ...value,
            templateMediaPath: res.data.path,
            templateMediaType: res.data.mediaType,
          });
        },
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: { message?: string } } };
          notifications.show({
            title: "Gagal upload media",
            message:
              axErr?.response?.data?.message ?? "Terjadi kesalahan saat upload",
            color: "red",
          });
          setPreviewUrl(null);
        },
      },
    );
  };

  return (
    <Stack gap="sm">
      <FileInput
        label="Media (Gambar/Video)"
        description="Format: jpg, png, webp, mp4, mov. Maksimal 50MB"
        placeholder="Pilih file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        onChange={handleFileChange}
      />
      {isUploading && <Progress value={progress} size="sm" animated />}
      {previewUrl && value.templateMediaType === "image" && (
        <Image src={previewUrl} radius="sm" mah={220} fit="contain" />
      )}
      {previewUrl && value.templateMediaType === "video" && (
        <video src={previewUrl} controls style={{ maxHeight: 220, width: "100%" }} />
      )}
      {value.templateMediaPath && !isUploading && (
        <Text size="xs" c="dimmed">
          Media siap dipakai
        </Text>
      )}
      <Textarea
        label="Caption"
        description="Teks yang akan diposting bersama media ini"
        placeholder="Tulis caption di sini..."
        minRows={3}
        autosize
        value={value.templateCaption}
        onChange={(e) =>
          onChange({ ...value, templateCaption: e.currentTarget.value })
        }
      />
    </Stack>
  );
}
