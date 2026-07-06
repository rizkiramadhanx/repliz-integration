import useGetAllAccount from "@/features/master-data/account/hooks/useGetAllAccount";
import type { typeDataAccount } from "@/features/master-data/account/type";
import type {
  typeAutoPostTarget,
  typeFacebookPostMode,
} from "@/features/master-data/auto-post-rule/type";
import {
  Divider,
  Group,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  TagsInput,
  Text,
} from "@mantine/core";

export type TargetsFieldsValue = {
  targets: typeAutoPostTarget[];
  facebookAccountId?: string;
  facebookPostMode?: typeFacebookPostMode;
  facebookGroupIds?: string[];
  instagramAccountId?: string;
  twitterAccountId?: string;
  telegramAccountId?: string;
  telegramChatIds?: string[];
};

const TARGET_OPTIONS: { key: typeAutoPostTarget; label: string }[] = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "telegram", label: "Telegram" },
  { key: "twitter", label: "Twitter / X" },
];

export default function TargetsFields({
  value,
  onChange,
}: {
  value: TargetsFieldsValue;
  onChange: (next: TargetsFieldsValue) => void;
}) {
  const { data: accountData } = useGetAllAccount({ page: 1, limit: 100 });
  const accounts: typeDataAccount[] = accountData?.data?.data ?? [];

  const accountOptionsByType = (type: typeDataAccount["type"]) =>
    accounts
      .filter((a) => a.type === type)
      .map((a) => ({ value: a.id, label: a.label }));

  const toggleTarget = (target: typeAutoPostTarget, checked: boolean) => {
    const nextTargets = checked
      ? [...value.targets, target]
      : value.targets.filter((t) => t !== target);
    onChange({ ...value, targets: nextTargets });
  };

  const isChecked = (target: typeAutoPostTarget) =>
    value.targets.includes(target);

  return (
    <Stack gap="sm">
      <Text fw={500} size="sm">
        Target Platform
      </Text>
      <Group gap="lg">
        {TARGET_OPTIONS.map((opt) => (
          <Group key={opt.key} gap="xs" wrap="nowrap">
            <Switch
              color="primary"
              size="sm"
              checked={isChecked(opt.key)}
              onChange={(e) => toggleTarget(opt.key, e.currentTarget.checked)}
            />
            <Text size="sm">{opt.label}</Text>
          </Group>
        ))}
      </Group>

      {isChecked("facebook") && (
        <>
          <Divider label="Facebook" labelPosition="left" />
          <Select
            label="Akun Facebook"
            placeholder="Pilih akun Facebook"
            data={accountOptionsByType("facebook")}
            value={value.facebookAccountId ?? null}
            onChange={(val) =>
              onChange({ ...value, facebookAccountId: val ?? undefined })
            }
          />
          <SegmentedControl
            fullWidth
            value={value.facebookPostMode ?? "wall"}
            onChange={(val) =>
              onChange({
                ...value,
                facebookPostMode: val as typeFacebookPostMode,
              })
            }
            data={[
              { label: "Wall", value: "wall" },
              { label: "Grup", value: "group" },
            ]}
          />
          {value.facebookPostMode === "group" && (
            <TagsInput
              label="ID Grup Facebook"
              description="Tekan Enter untuk menambah ID grup"
              placeholder="mis. 123456789012345"
              value={value.facebookGroupIds ?? []}
              onChange={(val) =>
                onChange({ ...value, facebookGroupIds: val })
              }
            />
          )}
        </>
      )}

      {isChecked("telegram") && (
        <>
          <Divider label="Telegram" labelPosition="left" />
          <Select
            label="Akun Telegram"
            placeholder="Pilih akun Telegram"
            data={accountOptionsByType("telegram")}
            value={value.telegramAccountId ?? null}
            onChange={(val) =>
              onChange({ ...value, telegramAccountId: val ?? undefined })
            }
          />
          <TagsInput
            label="Chat ID Telegram"
            description="Kosongkan untuk memakai chat ID default dari akun. Tekan Enter untuk menambah."
            placeholder="mis. -1001234567890"
            value={value.telegramChatIds ?? []}
            onChange={(val) => onChange({ ...value, telegramChatIds: val })}
          />
        </>
      )}

      {isChecked("instagram") && (
        <>
          <Divider label="Instagram" labelPosition="left" />
          <Select
            label="Akun Instagram"
            placeholder="Pilih akun Instagram"
            data={accountOptionsByType("instagram")}
            value={value.instagramAccountId ?? null}
            onChange={(val) =>
              onChange({ ...value, instagramAccountId: val ?? undefined })
            }
          />
        </>
      )}

      {isChecked("twitter") && (
        <>
          <Divider label="Twitter / X" labelPosition="left" />
          <Select
            label="Akun Twitter"
            placeholder="Pilih akun Twitter"
            data={accountOptionsByType("twitter")}
            value={value.twitterAccountId ?? null}
            onChange={(val) =>
              onChange({ ...value, twitterAccountId: val ?? undefined })
            }
          />
        </>
      )}
    </Stack>
  );
}
