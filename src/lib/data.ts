export type Admin = {
  id: string;
  name: string;
  email: string;
  role: "Administrador";
  status: "Activo" | "Inactivo";
};

export const initialAdmins: Admin[] = [
  { id: "ADM001", name: "Ana López", email: "ana.lopez@example.com", role: "Administrador", status: "Activo" },
  { id: "ADM002", name: "Carlos Martínez", email: "carlos.martinez@example.com", role: "Administrador", status: "Activo" },
  { id: "ADM003", name: "María García", email: "maria.garcia@example.com", role: "Administrador", status: "Inactivo" },
  { id: "ADM004", name: "José Hernández", email: "jose.hernandez@example.com", role: "Administrador", status: "Activo" },
];
