import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import useMutateListFacebookGroups, {
  type typeFacebookGroup,
} from "@/features/master-data/account/hooks/useMutateListFacebookGroups";
import type { typeDataAccount } from "@/features/master-data/account/type";
import {
  Button,
  Checkbox,
  CopyButton,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { MdOutlineClose } from "react-icons/md";

export default function ModalScrapeGroupFacebook({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [groups, setGroups] = useState<typeFacebookGroup[]>([]);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const facebookAccounts: typeDataAccount[] = (
    accountData?.data?.data ?? []
  ).filter((a) => a.type === "facebook");

  const { mutate: listFacebookGroups, isPending } =
    useMutateListFacebookGroups();

  const handleScrape = () => {
    if (!accountId) {
      notifications.show({
        title: "Pilih akun dulu",
        message: "Pilih akun Facebook sebelum scrape grup",
        color: "yellow",
      });
      return;
    }
    listFacebookGroups(accountId, {
      onSuccess: (res) => {
        const result = res.data ?? [];
        setGroups(result);
        setCheckedIds(result.map((g) => g.id));
        notifications.show({
          title: "Sukses",
          message: `Ditemukan ${result.length} grup`,
          color: "green",
        });
      },
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { message?: string } } };
        notifications.show({
          title: "Gagal scrape grup",
          message: axErr?.response?.data?.message ?? "Terjadi kesalahan",
          color: "red",
        });
      },
    });
  };

  const handleClose = () => {
    setAccountId(null);
    setGroups([]);
    setCheckedIds([]);
    onClose();
  };

  const toggleChecked = (id: string, checked: boolean) => {
    setCheckedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  const allChecked = groups.length > 0 && checkedIds.length === groups.length;
  const someChecked = checkedIds.length > 0 && !allChecked;

  const toggleCheckAll = () => {
    setCheckedIds(allChecked ? [] : groups.map((g) => g.id));
  };

  const checkedGroups = groups.filter((g) => checkedIds.includes(g.id));
  const groupListText = checkedGroups
    .map((g) => `${g.id} (${g.name})`)
    .join("\n");

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title="Scrape My Groups (Facebook)"
      size="xl"
      centered
      closeOnClickOutside={false}
      withCloseButton
      closeButtonProps={{ icon: <MdOutlineClose /> }}
    >
      <Stack gap="xs">
        <Group align="flex-end">
          <Select
            label="Akun Facebook"
            placeholder="Pilih akun"
            data={facebookAccounts.map((a) => ({
              value: a.id,
              label: a.label,
            }))}
            value={accountId}
            onChange={setAccountId}
            style={{ flex: 1 }}
          />
          <Button loading={isPending} onClick={handleScrape}>
            Scrape My Groups
          </Button>
        </Group>

        {groups.length > 0 && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Hasil ({groups.length} grup, {checkedIds.length} dipilih)
              </Text>
              <CopyButton value={groupListText}>
                {({ copied, copy }) => (
                  <Button
                    size="xs"
                    variant="light"
                    disabled={checkedIds.length === 0}
                    onClick={copy}
                  >
                    {copied ? "Tersalin" : "Copy yang Dicentang"}
                  </Button>
                )}
              </CopyButton>
            </Group>
            <Table.ScrollContainer minWidth={200} maxHeight={400}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}>
                      <Checkbox
                        checked={allChecked}
                        indeterminate={someChecked}
                        onChange={toggleCheckAll}
                      />
                    </Table.Th>
                    <Table.Th>ID Grup</Table.Th>
                    <Table.Th>Nama</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {groups.map((g) => (
                    <Table.Tr key={g.id}>
                      <Table.Td>
                        <Checkbox
                          checked={checkedIds.includes(g.id)}
                          onChange={(e) =>
                            toggleChecked(g.id, e.currentTarget.checked)
                          }
                        />
                      </Table.Td>
                      <Table.Td>{g.id}</Table.Td>
                      <Table.Td>{g.name}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
