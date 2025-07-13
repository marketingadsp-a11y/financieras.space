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
  username: string;
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
  totalDebt: number;
  paidAmount: number;
  lastPaymentDate?: Date;
  status: "Al corriente" | "Atrasado" | "Vencido";
};

export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
};
