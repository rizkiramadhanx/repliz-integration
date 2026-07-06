export type typeDataCategory = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type typeDataCreateCategoryPayload = {
  name: string;
};

export type typeDataUpdateCategoryPayload = {
  name?: string;
};
