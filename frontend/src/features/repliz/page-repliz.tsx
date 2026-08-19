import useGetAllReplizAccount from "@/features/repliz/hooks/useGetAllReplizAccount";
import { buildProfileUrl } from "@/features/repliz/profile-url";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import dayjs from "@/libs/dayjs";
import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Input,
  Pagination,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { useState } from "react";
import { CiSearch } from "react-icons/ci";
import { MdOpenInNew } from "react-icons/md";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "pink",
  threads: "dark",
  facebook: "blue",
  tiktok: "grape",
  youtube: "red",
  linkedin: "cyan",
  shopee: "orange",
};

export default function PageRepliz() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState({ search: "", page: 1, limit: 25 });
  const [inputSearch, setInputSearch] = useState("");

  const { data, isLoading, isError, error, refetch } =
    useGetAllReplizAccount(filter);

  const debouncedSearch = useDebounceCallback((val: string) => {
    setFilter((prev) => ({ ...prev, search: val, page: 1 }));
  }, 500);

  const accounts = data?.data?.data?.docs ?? [];
  const totalDocs = data?.data?.data?.totalDocs ?? 0;
  const totalPages = data?.data?.data?.totalPages ?? 0;

  const errorMessage =
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? "Gagal memuat akun Repliz";

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
        <Text fw={600}>Account Repliz</Text>
      </Group>

      <Flex
        display="flex"
        direction={{ base: "column", md: "row" }}
        gap={10}
        mt={10}
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Button
          w={{ base: "100%", md: "auto" }}
          onClick={() => refetch()}
          loading={isLoading}
          color="primary"
          size="sm"
        >
          Muat Ulang
        </Button>
        <Input
          size="sm"
          leftSection={<CiSearch size={18} />}
          placeholder="Cari nama / username"
          value={inputSearch}
          onChange={(e) => {
            setInputSearch(e.currentTarget.value);
            debouncedSearch(e.currentTarget.value);
          }}
          w={{ base: "100%", md: 260 }}
        />
      </Flex>

      <Box mt={20}>
        <Table.ScrollContainer minWidth={720}>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Akun</Table.Th>
                <Table.Th>Username</Table.Th>
                <Table.Th>Platform</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Account ID</Table.Th>
                <Table.Th>Terhubung Sejak</Table.Th>
                <Table.Th ta="center">Aksi</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py={20}>
                      Memuat…
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}

              {!isLoading && isError && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="red" py={20}>
                      {errorMessage}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}

              {!isLoading && !isError && accounts.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py={20}>
                      Belum ada akun terhubung di Repliz
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}

              {!isLoading &&
                !isError &&
                accounts.map((account) => {
                  const profileUrl = buildProfileUrl(account);

                  return (
                  <Table.Tr key={account.id ?? account._id}>
                    <Table.Td>
                      <Group gap={10} wrap="nowrap">
                        <Avatar
                          src={account.picture}
                          alt={account.name}
                          radius="xl"
                          size={32}
                          component={profileUrl ? "a" : undefined}
                          href={profileUrl ?? undefined}
                          target={profileUrl ? "_blank" : undefined}
                          rel={profileUrl ? "noopener noreferrer" : undefined}
                          sx={profileUrl ? { cursor: "pointer" } : undefined}
                        />
                        <Text size="sm">{account.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {profileUrl ? (
                        <Anchor
                          href={profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                        >
                          @{account.username}
                        </Anchor>
                      ) : (
                        <Text size="sm">@{account.username}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={PLATFORM_COLOR[account.type] ?? "gray"}
                        variant="light"
                      >
                        {account.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={account.isConnected ? "green" : "red"}
                        variant="light"
                      >
                        {account.isConnected ? "connected" : "disconnected"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {account.id ?? account._id}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {account.createdAt
                        ? dayjs(account.createdAt).format("DD MMM YYYY HH:mm")
                        : "-"}
                    </Table.Td>
                    <Table.Td ta="center">
                      <Tooltip
                        label={
                          profileUrl
                            ? "Buka profil di tab baru"
                            : `Platform ${account.type} belum didukung`
                        }
                      >
                        <ActionIcon
                          variant="light"
                          color="primary"
                          disabled={!profileUrl}
                          component={profileUrl ? "a" : "button"}
                          href={profileUrl ?? undefined}
                          target={profileUrl ? "_blank" : undefined}
                          rel={profileUrl ? "noopener noreferrer" : undefined}
                          aria-label={`Buka profil ${account.username}`}
                        >
                          <MdOpenInNew size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                  );
                })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Box>

      <Flex
        mt={16}
        direction={{ base: "column", md: "row" }}
        gap={10}
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Text size="sm" c="dimmed">
          Total {totalDocs} akun
        </Text>
        {totalPages > 1 && (
          <Pagination
            total={totalPages}
            value={filter.page}
            onChange={(page) => setFilter((prev) => ({ ...prev, page }))}
            size="sm"
          />
        )}
      </Flex>
    </Box>
  );
}
