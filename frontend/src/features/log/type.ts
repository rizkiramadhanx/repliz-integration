export type typeDataLogUser = {
  id: string;
  name: string;
  email: string;
};

export type typeDataLog = {
  id: string;
  action: string;
  userId: string | null;
  timestamp: string;
  status: string;
  statusCode: string | null;
  user: typeDataLogUser | null;
};

export type typeDataLogMeta = {
  page: number;
  limit: number;
  total: number;
  total_page: number;
};

export type typeDataLogListResponse = {
  status: string;
  code: number;
  message: string;
  data: typeDataLog[];
  meta: typeDataLogMeta;
};

export type typeDataLogDetailResponse = {
  status: string;
  code: number;
  message: string;
  data: typeDataLog;
};
