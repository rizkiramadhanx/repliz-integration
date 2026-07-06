export type typeDataRole = {
  id: string;
  name: string;
  is_admin: boolean;
  actions: string[];
  outlet_id: string;
  created_at: string;
  updated_at: string;
};

export type typeDataRoleListActionItem = {
  name: string;
  actions: string[];
};

export type typeDataCreateRolePayload = {
  name: string;
  actions: string[];
};

export type typeDataUpdateRolePayload = {
  name?: string;
  actions?: string[];
};
