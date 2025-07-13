export type Customer = {
  id: string;
  name: string;
  email: string;
  loanAmount: number;
  dueDate: string;
  riskLevel: "Bajo" | "Medio" | "Alto";
  status: "Pagado" | "Pendiente" | "Vencido";
};

export const customers: Customer[] = [
  { id: "CUST001", name: "John Doe", email: "john.d@example.com", loanAmount: 15000, dueDate: "2024-08-15", riskLevel: "Bajo", status: "Pendiente" },
  { id: "CUST002", name: "Jane Smith", email: "jane.s@example.com", loanAmount: 5000, dueDate: "2024-07-20", riskLevel: "Alto", status: "Vencido" },
  { id: "CUST003", name: "Sam Brown", email: "sam.b@example.com", loanAmount: 25000, dueDate: "2024-06-30", riskLevel: "Alto", status: "Vencido" },
  { id: "CUST004", name: "Emily White", email: "emily.w@example.com", loanAmount: 10000, dueDate: "2024-08-25", riskLevel: "Medio", status: "Pendiente" },
  { id: "CUST005", name: "Michael Green", email: "michael.g@example.com", loanAmount: 7500, dueDate: "2024-07-10", riskLevel: "Bajo", status: "Pagado" },
  { id: "CUST006", name: "Sarah Black", email: "sarah.b@example.com", loanAmount: 30000, dueDate: "2024-08-01", riskLevel: "Medio", status: "Pendiente" },
  { id: "CUST007", name: "David King", email: "david.k@example.com", loanAmount: 12000, dueDate: "2024-05-15", riskLevel: "Alto", status: "Vencido" },
  { id: "CUST008", name: "Laura Hill", email: "laura.h@example.com", loanAmount: 2000, dueDate: "2024-07-05", riskLevel: "Bajo", status: "Pagado" },
  { id: "CUST009", name: "James Young", email: "james.y@example.com", loanAmount: 18000, dueDate: "2024-09-01", riskLevel: "Bajo", status: "Pendiente" },
  { id: "CUST010", name: "Linda Scott", email: "linda.s@example.com", loanAmount: 22000, dueDate: "2024-07-28", riskLevel: "Medio", status: "Vencido" },
];
