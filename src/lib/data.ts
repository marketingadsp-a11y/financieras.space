import type { Timestamp } from "firebase/firestore";

export type Admin = {
  id: string;
  name: string;
  username: string;
  role: "Administrador";
  status: "Activo" | "Inactivo";
  password?: string;
  accessibleTools?: string[];
};

export type SuperAdmin = {
  id: string;
  username:string;
  password?: string;
};

export type Plaza = {
  id: string;
  name: string;
  pendingDebt: number;
  recoveryRate: number;
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
};

export type Payment = {
  id: string;
  customerId: string;
  amount: number;
  date: number; // Using number for timestamp (milliseconds)
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
