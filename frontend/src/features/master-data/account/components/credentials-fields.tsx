import type { typeAccountType } from "@/features/master-data/account/type";
import { JsonInput, PasswordInput, TextInput } from "@mantine/core";

export default function CredentialsFields({
  type,
  value,
  onChange,
}: {
  type: typeAccountType;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  if (type === "twitter" || type === "facebook" || type === "instagram") {
    const cookiesText = JSON.stringify(value.cookies ?? [], null, 2);
    return (
      <>
        <TextInput
          label="Username"
          description="Username akun ini (tanpa @)"
          placeholder="mis. wanitaberkelas"
          value={(value.username as string) ?? ""}
          onChange={(e) =>
            onChange({ ...value, username: e.currentTarget.value })
          }
        />
        <JsonInput
          mt="sm"
          label="Cookies (JSON array)"
          description='Export cookie session dari browser, format: [{"name":"...","value":"...","domain":"..."}]'
          minRows={6}
          autosize
          value={cookiesText}
          onChange={(text) => {
            try {
              onChange({ ...value, cookies: JSON.parse(text) });
            } catch {
              // biarkan user lanjut mengetik JSON yang belum valid
            }
          }}
        />
      </>
    );
  }

  if (type === "telegram") {
    return (
      <>
        <PasswordInput
          label="Bot Token"
          description="Dari @BotFather"
          value={(value.botToken as string) ?? ""}
          onChange={(e) =>
            onChange({ ...value, botToken: e.currentTarget.value })
          }
        />
        <TextInput
          mt="sm"
          label="Chat ID"
          description="ID chat/channel/group tujuan post"
          value={(value.chatId as string) ?? ""}
          onChange={(e) =>
            onChange({ ...value, chatId: e.currentTarget.value })
          }
        />
      </>
    );
  }

  return (
    <PasswordInput
      label="Discord Token"
      value={(value.token as string) ?? ""}
      onChange={(e) => onChange({ ...value, token: e.currentTarget.value })}
    />
  );
}
