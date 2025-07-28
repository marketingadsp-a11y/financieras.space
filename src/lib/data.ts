
import type { Timestamp } from "firebase/firestore";
import { FolderKanban, Landmark, BookCheck, Files, Workflow } from "lucide-react";

export type LinkedAdminAccess = {
  adminId: string;
  adminName: string;
  allowedTools: string[];
}

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
  linkedAdmins?: LinkedAdminAccess[];
};

export const INCOME_EXPENSES_PERMISSIONS = {
    CAN_VIEW_BALANCE: 'Ver Balance',
    CAN_TRANSACT: 'Registrar Transacciones',
    CAN_TRANSFER_TO_CENTRAL: 'Enviar a Capital',
    CAN_MANAGE_CATEGORIES: 'Gestionar Categorías',
} as const;
export type IncomeExpensesPermission = keyof typeof INCOME_EXPENSES_PERMISSIONS;

export type SucursalAccess = {
  sucursalId: string;
  permissions: IncomeExpensesPermission[];
}

export type ToolAdmin = {
  id: string;
  name: string;
  username: string;
  status: "Activo" | "Inactivo";
  password?: string;
  toolId: 'cartera-vencida' | 'income-expenses' | 'daily-control' | 'loan-control';
  prefix?: string;
  createdBy?: string;
  sucursalAccess?: SucursalAccess[]; // Array of sucursal access objects
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
  toolContext: 'overdue-portfolio' | 'loan-control';
  totalLoanAmount?: number;
};

export const PERMISSIONS = {
  CAN_REGISTER: 'Registrar Clientes',
  CAN_IMPORT: 'Importar Clientes',
  CAN_EXPORT: 'Exportar Datos',
  CAN_DELETE_ALL: 'Eliminar Todos los Clientes',
} as const;
export type Permission = keyof typeof PERMISSIONS;

export const LOAN_CONTROL_PERMISSIONS = {
  CAN_EDIT_PLAZA_NAMES: 'Editar Nombres de Plazas',
  CAN_DELETE_ALL_DATA: 'Eliminar Todos los Datos',
} as const;
export type LoanControlPermission = keyof typeof LOAN_CONTROL_PERMISSIONS;


export type PlazaAccess = {
  plazaId: string;
  plazaName: string;
  permissions: Permission[];
}

export type LoanControlPermissions = {
    permissions: LoanControlPermission[];
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
  loanControlPermissions?: LoanControlPermissions;
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
  fechaPrestamo?: Date;
  status: "Pendiente" | "Pagado" | "Atrasado";
  prefix?: string;
  loanControlGroupId?: string; // Relation to Loan Control Group
  toolContext?: 'overdue-portfolio' | 'loan-control';
  promoter?: string;
  groupName?: string;
};


export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color?: string;
};

export const allTools: Tool[] = [
  {
    id: "cartera-vencida",
    name: "Cartera Vencida",
    description: "Gestión de clientes con cartera vencida, registro de plazas y control de deuda.",
    href: "/tools/overdue-portfolio",
    icon: FolderKanban,
    color: '#ef4444'
  },
   {
    id: "income-expenses",
    name: "Gastos e Ingresos",
    description: "Administra el capital, asigna fondos a sucursales y lleva un control de los balances.",
    href: "/tools/income-expenses",
    icon: Landmark,
    color: '#22c55e'
  },
  {
    id: "daily-control",
    name: "Control Diario",
    description: "Registra y sigue el flujo financiero diario (cobrado, prestado, gastado) por plaza.",
    href: "/tools/daily-control",
    icon: BookCheck,
    color: '#eab308'
  },
  {
    id: "loan-control",
    name: "Control de Préstamo",
    description: "Organiza clientes en Plazas, Carteras y Grupos para un seguimiento detallado.",
    href: "/tools/loan-control",
    icon: Files,
    color: '#3b82f6'
  },
  {
    id: "flujo",
    name: "Flujo",
    description: "Visualiza y gestiona el flujo de operaciones y procesos.",
    href: "/tools/flujo",
    icon: Workflow,
    color: '#8b5cf6'
  }
];

// Helper function to get tools with customized names and colors from localStorage
export function getCustomizedTools(): Tool[] {
  if (typeof window === 'undefined') {
    return allTools;
  }
  const storedSettings = JSON.parse(localStorage.getItem('toolSettings') || '[]');
  return allTools.map(tool => {
    const customSetting = storedSettings.find((s: any) => s.id === tool.id);
    return {
      ...tool,
      name: customSetting?.name || tool.name,
      color: customSetting?.color || tool.color,
    };
  });
}


export type Sucursal = {
    id: string;
    prefix: string;
    name: string;
    manager: string;
    currentBalance: number; // Caja chica
    logoUrl?: string;
};

export type CentralAccount = {
    id: string; // Will typically be the prefix
    prefix: string;
    currentBalance: number;
    assignedCapital: number;
    totalBranchBalance: number;
};

export type CentralAccountTransaction = {
    id: string;
    accountId: string;
    type: 'deposit' | 'withdrawal' | 'assignment';
    amount: number;
    date: Date;
    userPerformed: string;
    description: string;
    from?: string; // e.g., 'External'
    to?: string; // e.g., sucursalId or 'External'
}

export type SucursalTransaction = {
    id: string;
    sucursalId: string;
    type: 'deposit' | 'expense' | 'transfer_to_central';
    amount: number;
    date: Date;
    userPerformed: string;
    description: string;
    executive?: string;
    category?: string;
}


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
    executive?: string;
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
  whatsappLinkTemplate?: string;
  smsDomain?: string;
  smsApiKey?: string;
  smsEmailTemplate?: string;
  resendFromEmail?: string;
};

// --- Loan Control Tool Models ---

export type LoanControlCartera = {
  id: string;
  name: string;
  plazaId: string;
  prefix: string;
}

export type LoanControlGrupo = {
  id: string;
  name: string;
  carteraId: string;
  plazaId: string;
  prefix: string;
}

export type TransactionCategory = {
  id: string;
  prefix: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
};

// --- Flujo Tool Models ---
export type FlujoSucursal = {
    id: string;
    prefix: string;
    name: string;
    manager: string;
    currentBalance: number;
};

export type FlujoCentralAccount = {
    id: string; // Corresponds to the prefix
    prefix: string;
    totalEfectivo: number;
    cajaChica: number;
};

export type FlujoEntry = {
    id: string;
    sucursalId: string;
    date: Date; // Changed from Timestamp to Date for easier use in components
    fondo: number;
    debeEntregar: number;
    falla: number;
    recuperado: number;
    salientes: number;
    entrantes: number;
    totalCobrado: number; // Calculated field
};

export type FlujoGasto = {
    id: string;
    amount: number;
    description: string;
    date: Date;
}

export type FlujoWeeklySummary = {
    id: string; // e.g. `sucursalId_2024-W30`
    sucursalId: string;
    weekStartDate: Date;
    weekEndDate: Date;
    totalCobradoSemanal: number;
    comisiones: number;
    gastos: FlujoGasto[];
}
