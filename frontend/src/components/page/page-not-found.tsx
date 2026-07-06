import { Center, Stack, Text, Title } from "@mantine/core";

export default function NotFound() {
  return (
    <Center h="100vh">
      <Stack align="center">
        <Title order={1}>404</Title>
        <Text size="lg">Halaman Tidak Ditemukan</Text>
      </Stack>
    </Center>
  );
}
