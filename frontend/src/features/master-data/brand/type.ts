export type typeDataBrand = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type typeDataCreateBrandPayload = {
  name: string;
};

export type typeDataUpdateBrandPayload = {
  name?: string;
};
