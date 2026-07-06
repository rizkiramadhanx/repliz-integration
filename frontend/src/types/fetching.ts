type typeDataMetaData = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type typeDataCommonResponse<T> = {
  code: number;
  message: string;
  data: T;
  metadata: typeDataMetaData;
};

export type { typeDataCommonResponse, typeDataMetaData };
