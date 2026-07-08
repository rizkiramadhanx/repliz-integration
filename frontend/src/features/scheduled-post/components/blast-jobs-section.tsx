import PaginationTotal from "@/components/moleculs/PaginationTotal";
import dayjs from "@/libs/dayjs";
import ModalScrapeGroupFacebook from "@/features/tools/components/modal-scrape-group-facebook";
import {
  Badge,
  Button,
  Flex,
  Group,
  Pagination,
  Table,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import useGetAllBlastJobs from "../hooks/useGetAllBlastJobs";
import useMutateStopBlast from "../hooks/useMutateStopBlast";
import ModalBlast from "./modal-blast";
import type { typeBlastJobStatus } from "../type";

const PAGE_LIMIT = 10;

const STATUS_COLOR: Record<typeBlastJobStatus, string> = {
  running: "blue",
  stopped: "gray",
  completed: "green",
  failed: "red",
};

const STATUS_LABEL: Record<typeBlastJobStatus, string> = {
  running: "Berjalan",
  stopped: "Dihentikan",
  completed: "Selesai",
  failed: "Gagal",
};

export default function BlastJobsSection() {
  const [blastModalOpen, setBlastModalOpen] = useState(false);
  const [scrapeGroupModalOpen, setScrapeGroupModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data, refetch } = useGetAllBlastJobs(
    { page, limit: PAGE_LIMIT },
    {
      refetchInterval: (query) => {
        const jobs = query.state.data?.data?.data ?? [];
        return jobs.some((j) => j.status === "running") ? 3000 : false;
      },
    },
  );
  const jobs = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const { mutate: stopBlast } = useMutateStopBlast();

  const handleStop = (id: string) => {
    stopBlast(id, {
      onSuccess: () => {
        notifications.show({
          title: "Sukses",
          message: "Blast dihentikan",
          color: "green",
        });
        refetch();
      },
    });
  };

  return (
    <>
      <Group justify="space-between" mt={30} mb={10}>
        <Text fw={600}>Blast Terjadwal (Grup Facebook)</Text>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            onClick={() => setScrapeGroupModalOpen(true)}
          >
            Scrape Grup
          </Button>
          <Button
            size="xs"
            color="primary"
            onClick={() => setBlastModalOpen(true)}
          >
            Blast Terjadwal
          </Button>
        </Group>
      </Group>

      {jobs.length > 0 && (
        <Table.ScrollContainer minWidth={700}>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Waktu Mulai</Table.Th>
                <Table.Th>Caption</Table.Th>
                <Table.Th>Progress</Table.Th>
                <Table.Th>Jeda</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Aksi</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {jobs.map((j) => (
                <Table.Tr key={j.id}>
                  <Table.Td>
                    <Text size="sm">
                      {dayjs(j.scheduled_at).format("DD MMM YYYY, HH.mm")}
                    </Text>
                  </Table.Td>
                  <Table.Td maw={200}>
                    <Text size="sm" truncate="end">
                      {j.caption}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {j.current_group_index}/{j.total_groups} grup
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{j.gap_minutes} menit</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={STATUS_COLOR[j.status]}
                      variant="light"
                      size="sm"
                    >
                      {STATUS_LABEL[j.status]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {j.status === "running" && (
                      <Button
                        size="xs"
                        color="orange"
                        variant="light"
                        onClick={() => handleStop(j.id)}
                      >
                        Stop
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      {jobs.length > 0 && (
        <Flex mt={10} justify="space-between" align="center" wrap="wrap" gap="sm">
          <PaginationTotal total={meta?.total ?? 0} page={page} limit={PAGE_LIMIT} />
          {(meta?.total_page ?? 0) > 1 && (
            <Pagination
              color="primary"
              value={page}
              total={meta?.total_page ?? 0}
              onChange={setPage}
            />
          )}
        </Flex>
      )}

      <ModalBlast
        open={blastModalOpen}
        onClose={() => setBlastModalOpen(false)}
        onSuccess={() => refetch()}
      />
      <ModalScrapeGroupFacebook
        open={scrapeGroupModalOpen}
        onClose={() => setScrapeGroupModalOpen(false)}
      />
    </>
  );
}
