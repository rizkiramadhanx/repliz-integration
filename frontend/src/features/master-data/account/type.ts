export type typeAccountType =
  | "twitter"
  | "telegram"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "discord";

export type typeDataAccount = {
  id: string;
  label: string;
  type: typeAccountType;
  is_active: boolean;
  connection_status: "unknown" | "connected" | "disconnected" | "error";
  connection_error: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  profile_url: string | null;
};

export type typeDataCreateAccountPayload = {
  label: string;
  type: typeAccountType;
  credentials: Record<string, unknown>;
};

export type typeDataUpdateAccountPayload = {
  label?: string;
  credentials?: Record<string, unknown>;
  isActive?: boolean;
};

export type typeDataDelegation = {
  id: string;
  user_id: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

export type typeDataDelegatePayload = {
  userId: string;
};
