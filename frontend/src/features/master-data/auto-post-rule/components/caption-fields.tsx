import type { typeCaptionReplacement } from "@/features/master-data/auto-post-rule/type";
import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { MdAdd, MdDelete } from "react-icons/md";

export type CaptionFieldsValue = {
  captionPrefix?: string;
  captionSuffix?: string;
  captionReplacements: typeCaptionReplacement[];
};

export default function CaptionFields({
  value,
  onChange,
}: {
  value: CaptionFieldsValue;
  onChange: (next: CaptionFieldsValue) => void;
}) {
  const addReplacement = () => {
    onChange({
      ...value,
      captionReplacements: [
        ...value.captionReplacements,
        { find: "", replace: "" },
      ],
    });
  };

  const updateReplacement = (
    index: number,
    field: "find" | "replace",
    val: string,
  ) => {
    const next = value.captionReplacements.map((item, i) =>
      i === index ? { ...item, [field]: val } : item,
    );
    onChange({ ...value, captionReplacements: next });
  };

  const removeReplacement = (index: number) => {
    onChange({
      ...value,
      captionReplacements: value.captionReplacements.filter(
        (_, i) => i !== index,
      ),
    });
  };

  return (
    <Stack gap="sm">
      <Textarea
        label="Prefix Caption"
        description="Ditambahkan di awal caption"
        placeholder="Teks pembuka..."
        autosize
        minRows={2}
        value={value.captionPrefix ?? ""}
        onChange={(e) =>
          onChange({ ...value, captionPrefix: e.currentTarget.value })
        }
      />
      <Textarea
        label="Suffix Caption"
        description="Ditambahkan di akhir caption"
        placeholder="Teks penutup..."
        autosize
        minRows={2}
        value={value.captionSuffix ?? ""}
        onChange={(e) =>
          onChange({ ...value, captionSuffix: e.currentTarget.value })
        }
      />

      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={500} size="sm">
            Cari & Ganti Kata
          </Text>
          <Button
            size="xs"
            variant="light"
            leftSection={<MdAdd />}
            onClick={addReplacement}
          >
            Tambah
          </Button>
        </Group>
        {value.captionReplacements.length === 0 && (
          <Text size="xs" c="dimmed">
            Belum ada aturan cari & ganti
          </Text>
        )}
        {value.captionReplacements.map((item, index) => (
          <Group key={index} gap="xs" wrap="nowrap" align="flex-end">
            <TextInput
              flex={1}
              label={index === 0 ? "Cari" : undefined}
              placeholder="kata dicari"
              value={item.find}
              onChange={(e) =>
                updateReplacement(index, "find", e.currentTarget.value)
              }
            />
            <TextInput
              flex={1}
              label={index === 0 ? "Ganti dengan" : undefined}
              placeholder="kata pengganti (boleh kosong)"
              value={item.replace}
              onChange={(e) =>
                updateReplacement(index, "replace", e.currentTarget.value)
              }
            />
            <ActionIcon
              color="red"
              variant="light"
              onClick={() => removeReplacement(index)}
            >
              <MdDelete />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}
