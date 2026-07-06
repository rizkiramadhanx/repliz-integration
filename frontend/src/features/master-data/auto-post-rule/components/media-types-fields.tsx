import type { typeAutoPostMediaType } from "@/features/master-data/auto-post-rule/type";
import { Group, Stack, Switch, Text } from "@mantine/core";

const MEDIA_TYPE_OPTIONS: { key: typeAutoPostMediaType; label: string }[] = [
  { key: "text", label: "Teks" },
  { key: "image", label: "Gambar" },
  { key: "video", label: "Video" },
];

export default function MediaTypesFields({
  value,
  onChange,
}: {
  value: typeAutoPostMediaType[];
  onChange: (next: typeAutoPostMediaType[]) => void;
}) {
  const toggle = (mediaType: typeAutoPostMediaType, checked: boolean) => {
    onChange(
      checked
        ? [...value, mediaType]
        : value.filter((m) => m !== mediaType),
    );
  };

  return (
    <Stack gap="xs">
      <Text fw={500} size="sm">
        Tipe Media
      </Text>
      <Group gap="lg">
        {MEDIA_TYPE_OPTIONS.map((opt) => (
          <Group key={opt.key} gap="xs" wrap="nowrap">
            <Switch
              color="primary"
              size="sm"
              checked={value.includes(opt.key)}
              onChange={(e) => toggle(opt.key, e.currentTarget.checked)}
            />
            <Text size="sm">{opt.label}</Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}
