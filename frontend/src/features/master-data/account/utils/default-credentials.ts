import type { typeAccountType } from "@/features/master-data/account/type";

export function defaultCredentials(
  type: typeAccountType,
): Record<string, unknown> {
  switch (type) {
    case "twitter":
    case "facebook":
    case "instagram":
      return { cookies: [], username: "" };
    case "telegram":
      return { botToken: "", chatId: "" };
    case "discord":
      return { token: "" };
  }
}
