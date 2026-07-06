import PaginationTotal from "@/components/moleculs/PaginationTotal";
import useGetAllUser from "@/features/master-data/user/hooks/useGetAllUser";
import useGetAllLog from "@/features/log/hooks/useGetAllLog";
import type { typeDataLog } from "@/features/log/type";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import dayjs from "@/libs/dayjs";
import {
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Input,
  Pagination,
  Select,
  Table,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { CiSearch } from "react-icons/ci";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "ERROR", label: "ERROR" },
];

export default function PageLog() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState({
    keyword: "",
    page: 1,
    limit: 25,
    action: "",
    user_id: "",
    status: "",
  });
  const [inputSearch, setInputSearch] = useState("");
  const [inputAction, setInputAction] = useState("");

  const { data: userListData } = useGetAllUser({ page: 1, limit: 100, keyword: "" });
  const users = userListData?.data ?? [];
  const userFilterOptions = [
    { value: "", label: "Semua User" },
    ...users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
  ];

  const debouncedSearch = useDebounceCallback((val: string) => {
    setFilter((prev) => ({ ...prev, keyword: val, page: 1 }));
  }, 500);

  const debouncedAction = useDebounceCallback((val: string) => {
    setFilter((prev) => ({ ...prev, action: val, page: 1 }));
  }, 500);

  const {
    data: dataLog,
    isLoading,
    isSuccess,
  } = useGetAllLog({
    page: filter.page,
    limit: filter.limit,
    keyword: filter.keyword,
    action: filter.action || undefined,
    user_id: filter.user_id || undefined,
    status: filter.status || undefined,
  });

  const logs = dataLog?.data?.data ?? [];
  const meta = dataLog?.data?.meta;
  const totalPages = meta?.total_page ?? 0;

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
        <Text fw={600}>Log Aktivitas</Text>
      </Group>

      <Flex
        display="flex"
        direction={{ base: "column", md: "row" }}
        gap={10}
        mt={10}
        sx={{ alignItems: "center", flexWrap: "wrap" }}
      >
        <Input
          size="sm"
          leftSection={<CiSearch size={18} />}
          onChange={(e) => {
            const val = e.target.value;
            setInputSearch(val);
            debouncedSearch(val);
          }}
          placeholder="Cari (keyword)..."
          value={inputSearch}
          w={{ base: "100%", sm: 200 }}
        />
        <Input
          size="sm"
          placeholder="Filter action..."
          value={inputAction}
          onChange={(e) => {
            const val = e.target.value;
            setInputAction(val);
            debouncedAction(val);
          }}
          w={{ base: "100%", sm: 180 }}
        />
        <Select
          size="sm"
          placeholder="User"
          data={userFilterOptions}
          value={filter.user_id || null}
          onChange={(value) =>
            setFilter((prev) => ({ ...prev, user_id: value ?? "", page: 1 }))
          }
          clearable
          w={{ base: "100%", sm: 220 }}
        />
        <Select
          size="sm"
          placeholder="Status"
          data={STATUS_OPTIONS}
          value={filter.status || null}
          onChange={(value) =>
            setFilter((prev) => ({ ...prev, status: value ?? "", page: 1 }))
          }
          clearable
          w={{ base: "100%", sm: 140 }}
        />
      </Flex>

      <Table.ScrollContainer
        mt={10}
        minWidth={200}
        maxHeight="calc(100vh - 300px)"
      >
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Waktu</Table.Th>
              <Table.Th>Action</Table.Th>
              <Table.Th>User</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Status Code</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isSuccess &&
              logs.length > 0 &&
              logs.map((row: typeDataLog) => (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Text size="sm">{row.timestamp ? dayjs(row.timestamp).format("DD MMM YYYY, HH.mm") : "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{row.action}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {row.user
                        ? `${row.user.name} (${row.user.email})`
                        : row.userId ?? "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={row.status === "SUCCESS" ? "green" : "red"}
                      variant="light"
                      size="sm"
                    >
                      {row.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{row.statusCode ?? "-"}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            {isSuccess && logs.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5} align="center" height={50}>
                  Tidak ada data ditemukan
                </Table.Td>
              </Table.Tr>
            )}
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={5} align="center" height={50}>
                  Loading...
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Flex mt={10} justify="space-between" align="center" px={20} wrap="wrap" gap="sm">
        <PaginationTotal
          total={meta?.total ?? 0}
          page={filter.page}
          limit={filter.limit}
        />
        {isSuccess && totalPages > 0 && (
          <Pagination
            color="primary"
            value={filter.page}
            total={totalPages}
            onChange={(e) => setFilter((prev) => ({ ...prev, page: e }))}
          />
        )}
      </Flex>
    </Box>
  );
}
