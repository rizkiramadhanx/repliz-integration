import { Box, Button, Group, Text } from "@mantine/core";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

export default function PageTools() {
  const navigate = useNavigate();

  return (
    <Box px={20} py={10}>
      <Group mb="md">
        <Button
          variant="filled"
          color="primary"
          size="xs"
          onClick={() => navigate(-1)}
        >
          <TiArrowBack />
        </Button>
        <Text fw={600}>Tools Lainnya</Text>
      </Group>

      <Text c="dimmed" size="sm">
        Belum ada tools di sini.
      </Text>
    </Box>
  );
}
