import { Box, Text } from "@mantine/core";

export default function PaginationTotal({
  total = 0,
  page,
  limit,
}: {
  total?: number;
  page: number;
  limit: number;
}) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  const start = total === 0 ? 0 : page === 1 ? 1 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : page === totalPages ? total : page * limit;

  return (
    <Box>
      <Text>
        {start} - {end} dari {total}
      </Text>
    </Box>
  );
}
