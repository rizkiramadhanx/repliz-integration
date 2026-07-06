type TypeDataResponseLogin = {
  data: {
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      name: string;
      email: string;
      picture?: string | null;
      role: {
        id: string;
        name: string;
        actions: string[];
      };
      outlet_id?: string;
      role_id: string;
    };
  };
};

type typeDataLogin = {
  email: string;
  password: string;
};

export type { typeDataLogin, TypeDataResponseLogin };
