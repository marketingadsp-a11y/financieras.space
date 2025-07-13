export type Admin = {
  id: string;
  name: string;
  email: string;
  role: "Administrador";
  status: "Activo" | "Inactivo";
  password?: string;
};

export type SuperAdmin = {
  id: string;
  username: string;
  password?: string;
};
