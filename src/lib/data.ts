import type { Timestamp } from "firebase/firestore";

export type Admin = {
  id: string;
  name: string;
  username: string;
  prefix: string;
  role: "Administrador";
  status: "Activo" | "Inactivo";
  password?: string;
  accessibleTools?: string[];
};

export type ToolAdmin = {
  id: string;
  name: string;
  username: string;
  status: "Activo" | "Inactivo";
  password?: string;
  toolId: 'cartera-vencida';
};

export type SuperAdmin = {
  id: string;
  username:string;
  password?: string;
  prefix?: string;
};

export type Plaza = {
  id: string;
  name: string;
  pendingDebt: number;
  recoveryRate: number;
  prefix?: string;
};

export const PERMISSIONS = {
  CAN_REGISTER: 'Registrar Clientes',
  CAN_IMPORT: 'Importar Clientes',
  CAN_EXPORT: 'Exportar Datos',
  CAN_DELETE_ALL: 'Eliminar Todos los Clientes',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export type PlazaAccess = {
  plazaId: string;
  plazaName: string;
  permissions: Permission[];
}

export type PlazaUser = {
  id: string;
  name: string;
  username: string;
  password?: string;
  status: 'Activo' | 'Inactivo';
  plazaAccess: PlazaAccess[];
  prefix?: string;
};

export type Customer = {
  id: string;
  plazaId: string;
  name: string;
  address: string;
  phone: string;
  guarantor: string;
  guarantorPhone: string;
  loanAmount: number;
  paymentAmount: number; // Monto de pago (cuota)
  installmentsDue: number; // No. vencidos
  dueAmount: number; // Adeudo actual
  status: "Pendiente" | "Pagado" | "Atrasado";
  prefix?: string;
};

export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
};

export const allTools: Tool[] = [
  {
    id: "cartera-vencida",
    name: "Cartera Vencida",
    description: "Gestión de clientes con cartera vencida, registro de plazas y control de deuda.",
    href: "/tools/overdue-portfolio",
  },
];
