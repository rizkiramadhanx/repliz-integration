import { Badge, Card, Checkbox, Image, SimpleGrid, Stack, Text } from "@mantine/core";
import type { typeDataScrapedPost } from "../type";

export default function ScrapeResultGrid({
  posts,
  selectedIds,
  onToggle,
}: {
  posts: typeDataScrapedPost[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4, md: 6 }}>
      {posts.map((p) => (
        <Card key={p.id} withBorder padding="xs" opacity={p.status === "used" ? 0.5 : 1}>
          <Stack gap={4}>
            <div style={{ position: "relative" }}>
              {p.thumbnail_url ? (
                <Image
                  src={p.thumbnail_url}
                  h={100}
                  fit="cover"
                  radius="sm"
                  referrerPolicy="no-referrer"
                  fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e9ecef'/%3E%3C/svg%3E"
                />
              ) : (
                <Text size="xs" c="dimmed" ta="center" py="lg">
                  Media
                </Text>
              )}
              {p.is_video && (
                <Badge
                  size="xs"
                  color="dark"
                  style={{ position: "absolute", top: 4, right: 4 }}
                >
                  Video
                </Badge>
              )}
            </div>
            <Text size="xs" lineClamp={2}>
              {p.caption || "(tanpa caption)"}
            </Text>
            <Checkbox
              size="xs"
              label={p.status === "used" ? "Sudah dipakai" : "Pilih"}
              checked={selectedIds.includes(p.id)}
              disabled={p.status === "used"}
              onChange={() => onToggle(p.id)}
            />
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}
