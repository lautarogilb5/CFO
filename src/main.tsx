import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { accountBalance, currencies, demo, localDate, money, parseAmount, summarize } from './finance';
import type { Account, Category, Currency, Direction, Ledger, Movement } from './finance';
import './style.css';

const storageKey = 'cfo-demo-v1';
const labels = { income: 'Ingreso', expense: 'Gasto' };
const paths = {
  home: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  list: 'M4 7h16M4 12h16M4 17h16M7 4L4 7l3 3m10 4 3 3-3 3',
  wallet: 'M20 8V5H5a2 2 0 0 0-2 2v12a1 1 0 0 0 1 1h16v-4m-1-8H5a2 2 0 0 1 0-4m16 6h-5a3 3 0 0 0 0 6h5z',
  grid: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
  plus: 'M12 5v14M5 12h14',
  up: 'M6 17 17 6M7 6h10v10',
  down: 'M6 7l11 11M7 18h10V8',
  right: 'm9 6 6 6-6 6',
  close: 'm6 6 12 12M18 6 6 18',
};
function Icon({ name, size = 22 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function readDemo(): { ledger: Ledger; warning: string } {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const ledger = JSON.parse(saved) as Ledger;
      if (![ledger.accounts, ledger.categories, ledger.records].every(Array.isArray)) throw new Error();
      return { ledger, warning: '' };
    }
    return { ledger: demo(), warning: '' };
  } catch {
    return { ledger: demo(), warning: 'No se pudieron leer los datos locales. Se cargó el ejemplo.' };
  }
}

function Sheet({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <dialog aria-labelledby="sheet-title" ref={element => {
    if (element && !element.open) element.showModal();
  }} onCancel={event => { event.preventDefault(); close(); }}>
    <div className="sheet-heading"><h2 id="sheet-title">{title}</h2><button className="icon-button" type="button" aria-label="Cerrar" onClick={close}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}

function MovementForm({ ledger, current, save, remove }: {
  ledger: Ledger; current?: Movement; save: (movement: Movement) => void; remove: (id: string) => void;
}) {
  const initialAccount = ledger.accounts.find(account => account.id === current?.entry.accountId);
  const [kind, setKind] = useState<Direction>(current?.kind ?? 'expense');
  const [currency, setCurrency] = useState<Currency>(initialAccount?.currency ?? 'UYU');
  const [accountId, setAccountId] = useState(initialAccount?.id ?? '');
  const [categoryId, setCategoryId] = useState(current?.categoryId ?? '');
  const [error, setError] = useState('');
  const accounts = ledger.accounts.filter(account => account.currency === currency);
  const categories = ledger.categories.filter(category => category.direction === kind);
  const selectedAccount = accounts.find(account => account.id === accountId) ?? accounts[0];
  const selectedCategory = categories.find(category => category.id === categoryId) ?? categories[0];
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const cents = parseAmount(String(data.get('amount')));
    const description = String(data.get('description')).trim();
    const date = String(data.get('date'));
    if (!cents || !description || !date || !selectedAccount || !selectedCategory) {
      setError('Completá todos los campos. Usá un importe positivo, sin separador de miles y con hasta dos decimales.');
      return;
    }
    save({ id: current?.id ?? newId(), kind, description, date,
      categoryId: selectedCategory.id, entry: { accountId: selectedAccount.id, cents } });
  }
  return <form onSubmit={submit}>
    <div className="segments" aria-label="Tipo de movimiento">
      {(['expense', 'income'] as const).map(direction => <button type="button" key={direction} aria-pressed={kind === direction} onClick={() => setKind(direction)}>{labels[direction]}</button>)}
    </div>
    <div className="fields">
      <label>Importe<input required name="amount" inputMode="decimal" placeholder="0,00" defaultValue={current ? (current.entry.cents / 100).toFixed(2).replace('.', ',') : ''} /></label>
      <label>Moneda<select aria-label="Moneda" value={currency} onChange={event => setCurrency(event.target.value as Currency)}><option value="UYU">UYU ($)</option><option value="USD">USD (US$)</option></select></label>
      <label className="full">Descripción<input name="description" required maxLength={80} placeholder="Ej. Supermercado" defaultValue={current?.description} /></label>
      <label>Cuenta<select aria-label="Cuenta" required value={selectedAccount?.id ?? ''} onChange={event => setAccountId(event.target.value)}>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label>Categoría<select aria-label="Categoría" required value={selectedCategory?.id ?? ''} onChange={event => setCategoryId(event.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="full">Fecha<input required type="date" name="date" defaultValue={current?.date ?? localDate()} /></label>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary wide" type="submit">Guardar movimiento</button>
    {current && <button className="danger wide" type="button" onClick={() => {
      if (window.confirm('¿Eliminar este movimiento?')) remove(current.id);
    }}>Eliminar movimiento</button>}
  </form>;
}

function newId() {
  return globalThis.crypto.randomUUID?.() ?? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),
    byte => byte.toString(16).padStart(2, '0')).join('');
}

const tabs = [
  { id: 'home', name: 'Inicio' }, { id: 'list', name: 'Movimientos' },
  { id: 'wallet', name: 'Cuentas' }, { id: 'grid', name: 'Categorías' },
] as const;
type Tab = typeof tabs[number]['id'];
const dateLabel = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short' });
function MovementList({ records, ledger, edit }: { records: Movement[]; ledger: Ledger; edit: (movement: Movement) => void }) {
  if (!records.length) return <p className="empty">Todavía no hay movimientos en esta vista.</p>;
  return <div className="panel rows">{records.map(record => {
    const account = ledger.accounts.find(item => item.id === record.entry.accountId);
    if (!account) return null;
    const category = ledger.categories.find(item => item.id === record.categoryId);
    return <button type="button" className="row" key={record.id} onClick={() => edit(record)}>
      <span className={`badge ${record.kind}`}><Icon name={record.kind === 'income' ? 'down' : 'up'} size={19} /></span>
      <span className="row-copy"><strong>{record.description}</strong><small>{category?.name ?? 'Sin categoría'} · {account.name}</small></span>
      <span className={`row-value ${record.kind}`}><strong>{record.kind === 'income' ? '+' : '−'}{money(record.entry.cents, account.currency)}</strong><small>{dateLabel.format(new Date(record.date + 'T12:00:00'))}</small></span>
      <Icon name="right" size={15} />
    </button>;
  })}</div>;
}

function BalanceCard({ currency, ledger, month }: { currency: Currency; ledger: Ledger; month: string }) {
  const totals = summarize(ledger, currency, month);
  return <article className={`balance ${currency.toLowerCase()}`}>
    <div className="balance-top"><span>{currency === 'UYU' ? 'Pesos uruguayos' : 'Dólares estadounidenses'}</span><span className="currency">{currency}</span></div>
    <strong className="amount">{money(totals.balance, currency)}</strong>
    <div className="balance-details">
      <div><span><Icon name="down" size={15} /> Ingresos</span><strong>{money(totals.income, currency)}</strong></div>
      <div><span><Icon name="up" size={15} /> Gastos</span><strong>{money(totals.expense, currency)}</strong></div>
    </div>
  </article>;
}

function CategoryForm({ current, categories, save, remove, used }: {
  current?: Category; categories: Category[]; save: (category: Category) => void;
  remove: (id: string) => void; used: boolean;
}) {
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const direction = used && current ? current.direction : data.get('direction') as Direction;
    if (!name || categories.some(category => category.id !== current?.id && category.direction === direction &&
      category.name.toLocaleLowerCase('es-UY') === name.toLocaleLowerCase('es-UY'))) {
      setError('Ingresá un nombre único para este tipo de categoría.');
      return;
    }
    save({ id: current?.id ?? newId(), name, direction });
  }
  return <form onSubmit={submit}>
    <div className="fields">
      <label className="full">Nombre<input required maxLength={40} name="name" defaultValue={current?.name} placeholder="Ej. Salud" /></label>
      <label className="full">Tipo<select aria-label="Tipo" name="direction" disabled={used} defaultValue={current?.direction ?? 'expense'}><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label>
    </div>
    {used && <p className="muted">Esta categoría tiene movimientos asociados. Podés cambiarle el nombre.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary wide" type="submit">Guardar categoría</button>
    {current && !used && <button className="danger wide" type="button" onClick={() => {
      if (window.confirm('¿Eliminar esta categoría?')) remove(current.id);
    }}>Eliminar categoría</button>}
  </form>;
}

function App() {
  const [initial] = useState(readDemo);
  const [ledger, setLedger] = useState(initial.ledger);
  const [warning, setWarning] = useState(initial.warning);
  const [tab, setTab] = useState<Tab>('home');
  const [filter, setFilter] = useState<Currency | 'all'>('all');
  const [sheet, setSheet] = useState<{ type: 'movement'; current?: Movement } | { type: 'category'; current?: Category } | null>(null);
  const now = new Date();
  const month = localDate(now).slice(0, 7);
  const monthName = new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' }).format(now);
  const records = ledger.records.filter((record): record is Movement => record.kind !== 'transfer')
    .sort((a, b) => b.date.localeCompare(a.date));
  const visible = records.filter(record => filter === 'all' || ledger.accounts.some(account => account.id === record.entry.accountId && account.currency === filter));

  function commit(next: Ledger) {
    setLedger(next);
    setSheet(null);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setWarning(''); }
    catch { setWarning('El navegador no pudo guardar los cambios. Se perderán al cerrar o recargar CFO.'); }
  }
  function go(next: Tab) {
    setTab(next);
    window.scrollTo(0, 0);
  }
  const edit = (current: Movement) => setSheet({ type: 'movement', current });
  const close = () => setSheet(null);

  return <>
    <header className="masthead"><div className="frame brandbar">
      <div className="brand"><img src="/icon-192.png" alt="" width="43" height="43" /><div><strong>CFO</strong><small>Finanzas personales</small></div></div>
      <span className="demo"><i /> Modo demo</span>
    </div></header>
    <main className="frame">
      <div className="page-heading">
        <div><p className="eyebrow">{tab === 'home' ? monthName : 'Finanzas personales'}</p><h1>{tabs.find(item => item.id === tab)?.name}</h1></div>
        {tab !== 'grid' && <button className="primary action" onClick={() => setSheet({ type: 'movement' })}><Icon name="plus" size={20} /><span>Nuevo movimiento</span></button>}
        {tab === 'grid' && <button className="primary action" onClick={() => setSheet({ type: 'category' })}><Icon name="plus" size={20} /><span>Nueva categoría</span></button>}
      </div>
      <p className="notice"><span aria-hidden="true">ⓘ</span> Datos ficticios · Almacenamiento local provisional</p>
      {warning && <p className="error" role="alert">{warning}</p>}

      {tab === 'home' && <>
        <section aria-labelledby="balances" className="section">
          <div className="section-heading"><h2 id="balances">Saldos por moneda</h2><span className="muted">Ingresos y gastos del mes</span></div>
          <div className="balances">{currencies.map(currency => <BalanceCard key={currency} currency={currency} ledger={ledger} month={month} />)}</div>
        </section>
        <section aria-labelledby="recent" className="section">
          <div className="section-heading"><h2 id="recent">Actividad reciente</h2><button className="text-button" onClick={() => go('list')}>Ver todos <Icon name="right" size={15} /></button></div>
          <MovementList records={records.slice(0, 5)} ledger={ledger} edit={edit} />
        </section>
      </>}

      {tab === 'list' && <section className="section" aria-label="Lista de movimientos">
        <div className="segments filter" aria-label="Filtrar por moneda">
          {(['all', ...currencies] as const).map(option => <button key={option} aria-pressed={filter === option} onClick={() => setFilter(option)}>{option === 'all' ? 'Todos' : option}</button>)}
        </div>
        <MovementList records={visible} ledger={ledger} edit={edit} />
      </section>}

      {tab === 'wallet' && currencies.map(currency => <section className="section" key={currency}>
        <div className="section-heading"><h2>{currency}</h2><span className="muted">Saldo actual</span></div>
        <div className="panel rows">{ledger.accounts.filter(account => account.currency === currency).map((account: Account) => <div className="row" key={account.id}>
          <span className="badge income"><Icon name="wallet" size={19} /></span>
          <span className="row-copy"><strong>{account.name}</strong><small>{account.kind === 'cash' ? 'Efectivo' : account.kind === 'bank' ? 'Cuenta bancaria' : 'Tarjeta de crédito'}</small></span>
          <span className="row-value"><strong>{money(accountBalance(account, ledger.records), currency)}</strong></span>
        </div>)}</div>
      </section>)}

      {tab === 'grid' && (['expense', 'income'] as const).map(direction => <section className="section" key={direction}>
        <div className="section-heading"><h2>{labels[direction]}s</h2></div>
        <div className="panel rows">{ledger.categories.filter(category => category.direction === direction).map(category => <button className="row" key={category.id} onClick={() => setSheet({ type: 'category', current: category })}>
          <span className={`badge ${direction}`}><Icon name="grid" size={17} /></span>
          <span className="row-copy"><strong>{category.name}</strong></span><Icon name="right" size={15} />
        </button>)}</div>
      </section>)}
    </main>
    <nav className="tabbar" aria-label="Navegación principal"><div className="frame tab-inner">
      {tabs.map(item => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => go(item.id)}><Icon name={item.id} size={22} /><span>{item.name}</span></button>)}
    </div></nav>
    {sheet?.type === 'movement' && <Sheet title={sheet.current ? 'Editar movimiento' : 'Nuevo movimiento'} close={close}>
      <MovementForm ledger={ledger} current={sheet.current} save={movement => commit({ ...ledger,
        records: sheet.current ? ledger.records.map(record => record.id === movement.id ? movement : record) : [movement, ...ledger.records],
      })} remove={id => commit({ ...ledger, records: ledger.records.filter(record => record.id !== id) })} />
    </Sheet>}
    {sheet?.type === 'category' && <Sheet title={sheet.current ? 'Editar categoría' : 'Nueva categoría'} close={close}>
      <CategoryForm categories={ledger.categories} current={sheet.current} used={records.some(record => record.categoryId === sheet.current?.id)}
        save={category => commit({ ...ledger, categories: sheet.current ? ledger.categories.map(item => item.id === category.id ? category : item) : [...ledger.categories, category] })}
        remove={id => commit({ ...ledger, categories: ledger.categories.filter(category => category.id !== id) })} />
    </Sheet>}
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => console.warn('CFO: modo sin conexión no disponible', error));
  });
}
