

import type { Timestamp } from "firebase/firestore";
import { FolderKanban, Landmark, BookCheck, Files, Workflow, CalendarClock, Percent, Notebook, ScanEye, HandCoins, NotebookText } from "lucide-react";

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
  visorAppPermissions?: VisorAppPermissions;
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

export type RegistroOficinaAccess = {
  oficinaId: string;
  permissions: RegistroOficinaPermission[];
}

export type ToolAdmin = {
  id: string;
  name: string;
  username: string;
  status: "Activo" | "Inactivo";
  password?: string;
  toolId: 'cartera-vencida' | 'income-expenses' | 'daily-control' | 'loan-control' | 'flujo' | 'mensuales' | 'registro-oficina' | 'visor-app' | 'compensacion-ejecutivos' | 'concentrado';
  prefix?: string;
  createdBy?: string;
  sucursalAccess?: SucursalAccess[]; // Array of sucursal access objects for 'income-expenses'
  registroOficinaAccess?: RegistroOficinaAccess[]; // Array of oficina access objects for 'registro-oficina'
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

export const OVERDUE_PORTFOLIO_PERMISSIONS = {
  CAN_EDIT_CUSTOMER: 'Editar Clientes',
  CAN_PROCESS_PAYMENTS: 'Procesar Abonos',
  CAN_DELETE_CUSTOMER: 'Eliminar Clientes',
  CAN_SEND_WHATSAPP: 'Enviar WhatsApp',
  CAN_SEND_SMS: 'Enviar SMS',
} as const;
export type OverduePortfolioPermission = keyof typeof OVERDUE_PORTFOLIO_PERMISSIONS;


export const LOAN_CONTROL_PERMISSIONS = {
  CAN_EDIT_PLAZA_NAMES: 'Editar Nombres de Plazas',
  CAN_DELETE_ALL_DATA: 'Eliminar Todos los Datos',
} as const;
export type LoanControlPermission = keyof typeof LOAN_CONTROL_PERMISSIONS;

export const FLUJO_PERMISSIONS = {
  CAN_DELETE: 'Eliminar registros de Flujo',
  CAN_EXPORT: 'Exportar Reportes',
} as const;
export type FlujoPermission = keyof typeof FLUJO_PERMISSIONS;

export const MENSUALES_PERMISSIONS = {
  CAN_MANAGE_OFFICES: 'Gestionar Oficinas',
  CAN_REGISTER_CLIENTS: 'Registrar Clientes',
  CAN_PROCESS_PAYMENTS: 'Procesar Pagos',
  CAN_EXPORT_REPORTS: 'Exportar Reportes',
} as const;
export type MensualesPermission = keyof typeof MENSUALES_PERMISSIONS;

export const REGISTRO_OFICINA_PERMISSIONS = {
  CAN_REGISTER_DATA: 'Registrar/Editar Datos',
  CAN_DELETE_MONTH: 'Eliminar Datos del Mes',
} as const;
export type RegistroOficinaPermission = keyof typeof REGISTRO_OFICINA_PERMISSIONS;

export const VISOR_APP_PERMISSIONS = {
  CAN_MANAGE_SUPERVISORS: 'Gestionar Supervisores',
  CAN_MANAGE_CLIENTS: 'Gestionar Clientes',
  CAN_MANAGE_SETTINGS: 'Gestionar Configuración',
} as const;
export type VisorAppPermission = keyof typeof VISOR_APP_PERMISSIONS;


export type PlazaAccess = {
  plazaId: string;
  plazaName: string;
  permissions: Permission[];
}

export type LoanControlPermissions = {
    permissions: LoanControlPermission[];
}

export type FlujoPermissions = {
    permissions: FlujoPermission[];
}

export type OverduePortfolioPermissions = {
    permissions: OverduePortfolioPermission[];
}

export type MensualesPermissions = {
    permissions: MensualesPermission[];
}

export type VisorAppPermissions = {
    permissions: VisorAppPermission[];
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
  flujoPermissions?: FlujoPermissions;
  overduePortfolioPermissions?: OverduePortfolioPermissions;
  mensualesPermissions?: MensualesPermissions;
  registroOficinaAccess?: RegistroOficinaAccess[];
  visorAppPermissions?: VisorAppPermissions;
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
  },
  {
    id: "mensuales",
    name: "Mensuales",
    description: "Gestiona préstamos con cobro de interés y abonos a capital mensuales.",
    href: "/tools/mensuales",
    icon: CalendarClock,
    color: '#14b8a6'
  },
  {
    id: "registro-oficina",
    name: "Registro de Oficina",
    description: "Registra y consolida datos semanales y mensuales por oficina.",
    href: "/tools/registro-oficina",
    icon: Notebook,
    color: '#f97316'
  },
  {
    id: "visor-app",
    name: "VisorApp",
    description: "Gestiona supervisores y los clientes asignados a cada uno con códigos QR.",
    href: "/tools/visor-app",
    icon: ScanEye,
    color: '#0ea5e9'
  },
  {
    id: "compensacion-ejecutivos",
    name: "Compensación de Ejecutivos",
    description: "Calcula la nómina final de un ejecutivo en base a bonos y métricas.",
    href: "/tools/compensacion-ejecutivos",
    icon: HandCoins,
    color: '#f43f5e'
  },
  {
    id: "concentrado",
    name: "Concentrado",
    description: "Lleva el concentrado de las oficinas y registra datos desde cada panel.",
    href: "/tools/concentrado",
    icon: NotebookText,
    color: '#16a34a'
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

export type HistoryLog = {
    id: string;
    prefix: string;
    toolContext: 'overdue-portfolio' | 'loan-control' | 'daily-control' | 'income-expenses';
    type: 'create' | 'update' | 'delete' | 'payment';
    timestamp: Date;
    userName: string;
    details: string;
    customerName?: string;
    amount?: number;
    promoter?: string;
    group?: string;
    plazaName?: string;
}

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
  visorAppSuccessImageUrl?: string;
  visorAppFailureImageUrl?: string;
  visorAppSuccessText?: string;
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

export type FlujoCentralTransaction = {
    id: string;
    prefix: string;
    type: 'transfer_in' | 'withdrawal';
    amount: number;
    date: Date;
    userPerformed: string;
    sucursalId?: string;
    sucursalName?: string;
    description?: string;
}

export type FlujoCentralAccount = {
    id: string; // Corresponds to the prefix
    prefix: string;
    totalEfectivo: number;
    cajaChica: number;
    transactions?: FlujoCentralTransaction[];
};

export type FlujoEntry = {
    id: string;
    sucursalId: string;
    date: Date; // Changed from Timestamp to Date for easier use in components
    type?: 'entry' | 'transfer_out_to_central';
    fondo: number;
    debeEntregar: number;
    falla: number;
    recuperado: number;
    salientes: number;
    entrantes: number;
    totalCobrado: number; // Calculated field
    amount: number; // For transfers
    userPerformed: string;
    centralTransactionId?: string; // Link to the central transaction
};

export type FlujoGasto = {
    id: string;
    amount: number;
    description: string;
    date: Date;
}

export type FlujoVenta = {
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
    ventas: FlujoVenta[];
}

export type SupportTicket = {
    id: string;
    userId: string;
    userName: string;
    userPrefix: string;
    description: string;
    contactPhone: string;
    status: 'new' | 'in-progress' | 'resolved';
    createdAt: number; // Using Unix timestamp
};

// --- Mensuales Tool Models ---
export type OficinaMensual = {
    id: string;
    prefix: string;
    name: string;
};

export type InterestRate = {
    id: string;
    prefix: string;
    value: number; // e.g., 5 for 5%
};


export type ClienteMensual = {
    id: string;
    displayId: string; // New 4-digit unique identifier
    oficinaId: string;
    prefix: string;
    name: string;
    loanAmount: number;
    paymentDay: number; // Day of the month (1-31)
    interestRateId: string;
    interestRateValue: number;
    currentBalance: number;
    unpaidInterest: number; // New field for accumulated interest
    registrationDate?: Date;
    lastInterestChargedDate?: Date;
    lastPaymentDate?: Date;
    status: 'vigente' | 'vencido' | 'liquidado';
};

export type MovimientoMensual = {
    id: string;
    clienteId: string;
    date: Date;
    type: 'charge_interest' | 'initial_loan' | 'pago_capital' | 'pago_interes';
    amount: number;
    notes?: string;
};

// --- Registro de Oficina ---
export type OficinaRegistro = {
  id: string;
  displayId: string;
  prefix: string;
  name: string;
};

export type OficinaSemanalRegistro = {
    id: string; // Composite key: `${oficinaId}_${weekStartDate.toISOString()}`
    oficinaId: string;
    prefix: string;
    weekStartDate: Date;
    recogidoSeguros: number;
    carteraVencida: number;
    interesMensual: number;
    capitalMensual: number;
    cajaChica: number;
    updatedAt: Date;
    updatedBy: string;
};

// --- Concentrado Tool Models ---
export type ConcentradoOficina = {
  id: string;
  prefix: string;
  name: string;
};

export type ConcentradoSemanal = {
  id: string; // Composite key: `${oficinaId}_${weekStartDate.toISOString()}`
  oficinaId: string;
  prefix: string;
  weekStartDate: Date;
  fondoInicio: number;
  venta: number;
  recolectado: number;
  gastos: number;
  fondoSiguienteSemana: number;
  cajaChica: number;
  seguros: number;
  interesMensual: number;
  carteraVencida: number;
  debe: number;
  saliente: number;
  falla: number;
  recuperado: number;
  adelantos: number;
  semanaExtra: number;
  updatedAt: Date;
  updatedBy: string;
};

// --- VisorApp ---
export type VisorSupervisor = {
    id: string;
    prefix: string;
    name: string;
    accessCode: string;
    logoUrl?: string;
};

export type VisorClient = {
    id: string;
    prefix: string;
    supervisorId: string;
    name: string;
    qrCodeValue: string; // The unique value embedded in the QR code
    address?: string;
};

export type VisorVisit = {
  id: string;
  prefix: string;
  supervisorId: string;
  clientId: string;
  clientName: string;
  timestamp: Date;
  latitude?: number;
  longitude?: number;
};


// --- Compensacion de Ejecutivos ---
export type Executive = { 
    id: string; 
    name: string; 
    plaza: string; 
    fechaIngreso: Date;
    status: 'Activo' | 'Inactivo';
};
export type Bonus = { id: string; name: string; percentage: number };

export type CompensationConfig = {
    id?: string; // prefix
    baseSalary?: number;
    baseBonus?: number;
    bonuses?: Bonus[];
    executives?: Executive[];
}

export type SavedBonus = {
    id: string;
    name: string;
    percentage: number;
    amount: number;
}

export type PayrollHistory = {
    id: string;
    prefix: string;
    date: Date;
    executiveId: string;
    executiveName: string;
    baseSalary: number;
    baseBonus: number;
    bonuses: SavedBonus[];
    totalBonusAmount: number;
    finalPayroll: number;
}
