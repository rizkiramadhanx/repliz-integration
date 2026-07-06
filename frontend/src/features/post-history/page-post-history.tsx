import useGetAllAutoPostRule from "@/features/master-data/auto-post-rule/hooks/useGetAllAutoPostRule";
import useGetQueueStatus from "@/features/master-data/auto-post-rule/hooks/useGetQueueStatus";
import useGetAllPostHistory from "@/features/post-history/hooks/useGetAllPostHistory";
import type { typeDataPostHistory } from "@/features/post-history/type";
import PaginationTotal from "@/components/moleculs/PaginationTotal";
import dayjs from "@/libs/dayjs";
import {
  Alert,
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Pagination,
  Select,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { useState } from "react";
import { MdOutlineInfo } from "react-icons/md";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Diproses" },
  { value: "success", label: "Sukses" },
  { value: "failed", label: "Gagal" },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "Semua Platform" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "twitter", label: "Twitter / X" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "yellow",
  success: "green",
  failed: "red",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "DIPROSES",
  success: "SUKSES",
  failed: "GAGAL",
};

const TRIGGER_LABEL: Record<string, string> = {
  discord_observer: "Discord Observer",
  discord_run_now: "Jalankan Manual",
};

const MEDIA_TYPE_LABEL: Record<string, string> = {
  text: "Teks",
  photo: "Foto",
  video: "Video",
};

export default function PagePostHistory() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState({
    page: 1,
    limit: 25,
    ruleId: "",
    status: "",
    platform: "",
  });

  const { data: ruleListData } = useGetAllAutoPostRule({
    page: 1,
    limit: 100,
  });
  const rules = ruleListData?.data?.data ?? [];
  const ruleFilterOptions = [
    { value: "", label: "Semua Rule" },
    ...rules.map((r) => ({ value: r.id, label: r.name })),
  ];

  const {
    data: dataHistory,
    isLoading,
    isSuccess,
  } = useGetAllPostHistory(filter);

  const histories = dataHistory?.data?.data ?? [];
  const meta = dataHistory?.data?.meta;
  const totalPages = meta?.total_page ?? 0;

  const { data: queueStatus } = useGetQueueStatus();
  const queueTotal = queueStatus?.data?.total ?? 0;

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
        <Text fw={600}>Riwayat Post</Text>
      </Group>
      {queueTotal > 0 && (
        <Alert
          icon={<MdOutlineInfo size={18} />}
          color="yellow"
          variant="light"
          mb="sm"
        >
          Terdapat {queueTotal} antrian post berjalan
        </Alert>
      )}

      <Flex
        display="flex"
        direction={{ base: "column", md: "row" }}
        gap={10}
        mt={10}
        sx={{ alignItems: "center", flexWrap: "wrap" }}
      >
        <Select
          size="sm"
          placeholder="Rule"
          data={ruleFilterOptions}
          value={filter.ruleId || null}
          onChange={(value) =>
            setFilter((prev) => ({ ...prev, ruleId: value ?? "", page: 1 }))
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
          w={{ base: "100%", sm: 160 }}
        />
        <Select
          size="sm"
          placeholder="Platform"
          data={PLATFORM_OPTIONS}
          value={filter.platform || null}
          onChange={(value) =>
            setFilter((prev) => ({ ...prev, platform: value ?? "", page: 1 }))
          }
          clearable
          w={{ base: "100%", sm: 180 }}
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
              <Table.Th>Rule</Table.Th>
              <Table.Th>Trigger</Table.Th>
              <Table.Th>Tipe</Table.Th>
              <Table.Th>Sumber</Table.Th>
              <Table.Th>Target</Table.Th>
              <Table.Th>Caption</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Link</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isSuccess &&
              histories.length > 0 &&
              histories.map((row: typeDataPostHistory) => (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Text size="sm">
                      {row.posted_at
                        ? dayjs(row.posted_at).format("DD MMM YYYY, HH.mm")
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{row.rule_name ?? "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="grape" size="sm">
                      {TRIGGER_LABEL[row.trigger_source] ?? row.trigger_source}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {MEDIA_TYPE_LABEL[row.media_type] ?? row.media_type}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {row.source_url ? (
                      <a
                        href={row.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.source_label ?? "Lihat sumber"}
                      </a>
                    ) : (
                      <Text size="sm">{row.source_label ?? "-"}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {row.target_account
                        ? `${row.target_account.label} (${row.target_account.type})`
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td maw={220}>
                    <Tooltip label={row.caption ?? ""} multiline maw={320}>
                      <Text size="sm" lineClamp={1}>
                        {row.caption ?? "-"}
                      </Text>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>
                    {row.status === "failed" ? (
                      <Tooltip label={row.error_message ?? "Unknown error"}>
                        <Badge
                          color={STATUS_COLOR[row.status]}
                          variant="light"
                          size="sm"
                        >
                          {STATUS_LABEL[row.status]}
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge
                        color={STATUS_COLOR[row.status] ?? "gray"}
                        variant="light"
                        size="sm"
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {row.post_url ? (
                      <Button
                        component="a"
                        href={row.post_url}
                        target="_blank"
                        rel="noreferrer"
                        size="xs"
                        color="blue"
                      >
                        Lihat Postingan
                      </Button>
                    ) : (
                      <Text size="sm" c="dimmed">
                        -
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            {isSuccess && histories.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={9} align="center" height={50}>
                  Tidak ada data ditemukan
                </Table.Td>
              </Table.Tr>
            )}
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={9} align="center" height={50}>
                  Loading...
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Flex
        mt={10}
        justify="space-between"
        align="center"
        px={20}
        wrap="wrap"
        gap="sm"
      >
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
