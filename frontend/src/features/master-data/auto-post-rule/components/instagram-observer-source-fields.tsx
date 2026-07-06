import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import { NumberInput, Select, Stack, Switch, TagsInput } from "@mantine/core";

export type InstagramObserverSourceValue = {
  instagramObserverAccountId?: string;
  instagramTargetUsernames: string[];
  excludeKeywords: string[];
  includeOriginalCaption: boolean;
  instagramCheckIntervalMinutes?: number;
};

export default function InstagramObserverSourceFields({
  value,
  onChange,
}: {
  value: InstagramObserverSourceValue;
  onChange: (next: InstagramObserverSourceValue) => void;
}) {
  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const instagramAccounts: typeDataAccount[] = (
    accountData?.data?.data ?? []
  ).filter((a) => a.type === "instagram");

  return (
    <Stack gap="sm">
      <Select
        label="Akun Instagram untuk Memantau"
        description="Akun ini dipakai untuk login & membaca postingan akun target"
        placeholder="Pilih akun Instagram"
        data={instagramAccounts.map((a) => ({ value: a.id, label: a.label }))}
        value={value.instagramObserverAccountId ?? null}
        onChange={(val) =>
          onChange({
            ...value,
            instagramObserverAccountId: val ?? undefined,
          })
        }
      />
      <TagsInput
        label="Username Instagram yang Dipantau"
        description="Tekan Enter untuk menambah username (tanpa @), bisa lebih dari satu"
        placeholder="mis. fifaworldcup"
        value={value.instagramTargetUsernames}
        onChange={(val) =>
          onChange({ ...value, instagramTargetUsernames: val })
        }
      />
      <TagsInput
        label="Kata yang Dihapus dari Caption"
        description="Opsional. Tekan Enter untuk menambah kata/frasa"
        placeholder="mis. giveaway"
        value={value.excludeKeywords}
        onChange={(val) => onChange({ ...value, excludeKeywords: val })}
      />
      <Switch
        label="Sertakan caption asli"
        description="Jika nonaktif, caption asli diabaikan (hanya prefix/suffix yang dipakai)"
        checked={value.includeOriginalCaption}
        onChange={(e) =>
          onChange({
            ...value,
            includeOriginalCaption: e.currentTarget.checked,
          })
        }
      />
      <NumberInput
        label="Interval Pengecekan (menit)"
        description="Minimal 60 menit untuk menghindari rate-limit/ban dari Instagram"
        placeholder="60"
        min={60}
        value={value.instagramCheckIntervalMinutes}
        onChange={(val) =>
          onChange({
            ...value,
            instagramCheckIntervalMinutes:
              typeof val === "number" ? val : undefined,
          })
        }
      />
    </Stack>
  );
}
