export const currencies = ['UYU', 'USD'] as const;
export type Currency = typeof currencies[number];
export type Direction = 'income' | 'expense';
export type Account = {
  id: string; name: string; currency: Currency; opening: number;
  kind: 'cash' | 'bank' | 'credit_card';
};
export type Category = { id: string; name: string; direction: Direction };
type Entry = { accountId: string; cents: number };
type RecordBase = { id: string; date: string; description: string };
export type Movement = RecordBase & {
  kind: Direction; categoryId: string; entry: Entry;
};
export type Transfer = RecordBase & {
  kind: 'transfer'; from: Entry; to: Entry;
};
export type LedgerRecord = Movement | Transfer;
export type Ledger = { accounts: Account[]; categories: Category[]; records: LedgerRecord[] };

const formatter = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function money(cents: number, currency: Currency) {
  return `${currency === 'UYU' ? '$' : 'US$'} ${formatter.format(cents / 100)}`;
}
export function localDate(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(value => String(value).padStart(2, '0')).join('-');
}
export function parseAmount(value: string) {
  const match = /^(\d{1,9})(?:[,.](\d{1,2}))?$/.exec(value.trim());
  return match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0')) : 0;
}
export function accountBalance(account: Account, records: LedgerRecord[]) {
  return records.reduce((total, record) => {
    if (record.kind === 'transfer') {
      return total + (record.to.accountId === account.id ? record.to.cents : 0)
        - (record.from.accountId === account.id ? record.from.cents : 0);
    }
    if (record.entry.accountId !== account.id) return total;
    return total + record.entry.cents * (record.kind === 'income' ? 1 : -1);
  }, account.opening);
}
export function summarize(ledger: Ledger, currency: Currency, month: string) {
  const accounts = ledger.accounts.filter(account => account.currency === currency);
  const balance = accounts.reduce((total, account) => total + accountBalance(account, ledger.records), 0);
  const ids = new Set(accounts.map(account => account.id));
  const totals = { income: 0, expense: 0 };
  for (const record of ledger.records) {
    if (record.kind === 'transfer' || !record.date.startsWith(month + '-') || !ids.has(record.entry.accountId)) continue;
    totals[record.kind] += record.entry.cents;
  }
  return { balance, ...totals };
}

export function demo(): Ledger {
  const day = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return localDate(date);
  };
  return {
    accounts: [
      { id: 'daily', name: 'Cuenta diaria', currency: 'UYU', opening: 2140000, kind: 'bank' },
      { id: 'cash', name: 'Efectivo', currency: 'UYU', opening: 320000, kind: 'cash' },
      { id: 'savings', name: 'Ahorros en dólares', currency: 'USD', opening: 94000, kind: 'bank' },
    ],
    categories: [
      { id: 'salary', name: 'Sueldo', direction: 'income' },
      { id: 'freelance', name: 'Trabajo independiente', direction: 'income' },
      { id: 'food', name: 'Alimentación', direction: 'expense' },
      { id: 'transport', name: 'Transporte', direction: 'expense' },
      { id: 'services', name: 'Servicios', direction: 'expense' },
    ],
    records: [
      { id: 'a', kind: 'expense', date: day(0), description: 'Supermercado', categoryId: 'food', entry: { accountId: 'daily', cents: 248000 } },
      { id: 'b', kind: 'expense', date: day(1), description: 'Transporte', categoryId: 'transport', entry: { accountId: 'cash', cents: 56000 } },
      { id: 'c', kind: 'income', date: day(2), description: 'Proyecto freelance', categoryId: 'freelance', entry: { accountId: 'savings', cents: 32000 } },
      { id: 'd', kind: 'income', date: day(3), description: 'Sueldo mensual', categoryId: 'salary', entry: { accountId: 'daily', cents: 4850000 } },
      { id: 'e', kind: 'expense', date: day(4), description: 'Internet', categoryId: 'services', entry: { accountId: 'daily', cents: 159000 } },
    ],
  };
}
