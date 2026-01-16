
export type ExpenseCategory = 'Travel' | 'Food' | 'Accommodation' | 'Other';

export interface TravelExpense {
  id: string;
  date: string;
  from: string;
  to: string;
  amount: string;
  attachment: File | null;
}

export interface GenericExpense {
  id: string;
  date: string;
  amount: string;
  attachment: File | null;
}

export interface FormData {
  expenseDate: string;
  branchName: string;
  salespersonName: string;
  categories: ExpenseCategory[];
  travelEntries: TravelExpense[];
  foodEntries: GenericExpense[];
  accommodationEntries: GenericExpense[];
  otherEntries: GenericExpense[];
  remark: string;
}

export interface BranchSalesData {
  [branch: string]: string[];
}
