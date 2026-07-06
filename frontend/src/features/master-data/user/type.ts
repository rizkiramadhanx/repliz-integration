export type typeDataUserRole = {
  id: string;
  name: string;
  isAdmin: boolean;
};

export type typeDataUser = {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  created_at: string;
  updated_at: string;
  role_id: string;
  outlet_id: string;
  role: typeDataUserRole;
};

export type typeDataUserDetail = typeDataUser & {
  is_confirmed: boolean;
};

export type typeDataMetaUser = {
  page: number;
  limit: number;
  total: number;
  total_page: number;
};

export type typeDataUserListResponse = {
  status: number;
  message: string;
  data: typeDataUser[];
  meta: typeDataMetaUser;
};

export type typeDataCreateUserPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role_id?: string;
  picture?: string;
};

export type typeDataUpdateUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  role_id?: string;
  outlet_id?: string;
  picture?: string;
};
