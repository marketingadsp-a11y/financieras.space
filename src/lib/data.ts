
import type { Timestamp } from "firebase/firestore";
import { FolderKanban, Landmark, BookCheck } from "lucide-react";

export type Admin = {
  id: string;
  name: string;
  username: string;
  prefix: string;
  role: "Administrador";
  status: "Activo" | "Inactivo";
  password?: string;
  accessibleTools?: string[];
  createdBy?: string;
};

export type ToolAdmin = {
  id: string;
  name: string;
  username: string;
  status: "Activo" | "Inactivo";
  password?: string;
  toolId: 'cartera-vencida' | 'income-expenses' | 'daily-control';
  prefix?: string;
  createdBy?: string;
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
  totalLoanAmount?: number;
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
  accessibleTools: string[];
  prefix?: string;
};

export type Customer = {
  id: string;
  plazaId: string;
  name: string;
  address: string;
  colonia?: string;
  cp?: string;
  phone: string;
  guarantor: string;
  guarantorPhone: string;
  direccionAval?: string;
  coloniaAval?: string;
  cpAval?: string;
  loanAmount: number;
  paymentAmount: number; // Monto de pago (cuota)
  installmentsDue: number; // No. vencidos
  dueAmount: number; // Adeudo actual
  fechaPrestamo?: Date;
  status: "Pendiente" | "Pagado" | "Atrasado";
  prefix?: string;
};


export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
};

export const allTools: Tool[] = [
  {
    id: "cartera-vencida",
    name: "Cartera Vencida",
    description: "Gestión de clientes con cartera vencida, registro de plazas y control de deuda.",
    href: "/tools/overdue-portfolio",
    icon: FolderKanban,
  },
   {
    id: "income-expenses",
    name: "Gastos e Ingresos",
    description: "Administra el capital, asigna fondos a sucursales y lleva un control de los balances.",
    href: "/tools/income-expenses",
    icon: Landmark,
  },
  {
    id: "daily-control",
    name: "Control Diario",
    description: "Registra y sigue el flujo financiero diario (cobrado, prestado, gastado) por plaza.",
    href: "/tools/daily-control",
    icon: BookCheck,
  }
];

export type Sucursal = {
    id: string;
    name: string;
    manager: string;
    currentBalance: number;
    logoUrl?: string;
};

export type CentralAccount = {
    id: string;
    currentBalance: number;
    assignedCapital: number;
    totalBranchBalance: number;
};

export type DailyRecordType = 'collected' | 'loaned' | 'spent';

export type ExpenseCategory = {
  id: string;
  prefix: string;
  name: string;
  icon: string;
};

export type DailyRecordEntry = {
    id: string;
    date: Date;
    type: DailyRecordType;
    amount: number;
    description: string;
    category?: string; // Storing category name as string
};

export type DailyRecord = {
  id: string;
  plazaId: string;
  prefix: string;
  date: Timestamp;
  collected: number;
  loaned: number;
  spent: number;
  entries: DailyRecordEntry[];
};

export type CompanyProfile = {
  id: string; // Corresponds to the prefix
  companyName: string;
  logoUrl?: string;
  loginBackgroundColor?: string;
};
