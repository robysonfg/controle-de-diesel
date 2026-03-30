import React, { useState, useEffect } from 'react';
import { Fuel, LogIn, LogOut, PlusCircle, MinusCircle, FileText, Home, ArrowRight, ArrowLeft, Download, FileDown, Loader2, AlertCircle, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
type TransactionType = 'in' | 'out';
type UserRole = 'admin' | 'operator';

interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  description: string;
  user: string;
}

const USERS: Record<string, { password: string; role: UserRole }> = {
  admin: { password: '123', role: 'admin' },
  vigia: { password: '123', role: 'operator' }
};

// Helper to parse dates robustly (handles ISO and DD/MM/YYYY HH:mm:ss)
const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Check if it's in DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/');
    if (timePart) {
      const [hour, minute, second] = timePart.split(':');
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second || 0));
    }
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  
  // Fallback to standard parsing (ISO)
  return new Date(dateStr);
};
// const mockTransactions: Transaction[] = [
//   { id: '1', date: '2026-03-28T10:00:00Z', type: 'in', amount: 1000, description: 'Compra Fornecedor A', user: 'admin' },
//   { id: '2', date: '2026-03-29T14:30:00Z', type: 'out', amount: 150, description: 'Consumo Gerador Principal', user: 'admin' },
// ];

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxNQdt_iiF_zDlMpfhuZ7OWUFdU1EAlYnnybe53TyvRAbfR4XhY4zrGquf4XMvunisFIA/exec';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{username: string, role: UserRole} | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'reports'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Google Sheets Integration State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (user: {username: string, role: UserRole}) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error('Erro ao carregar dados');
      const data = await response.json();
      
      // Sort by date descending
      const sortedData = data.sort((a: Transaction, b: Transaction) => 
        parseDate(b.date).getTime() - parseDate(a.date).getTime()
      );
      setTransactions(sortedData);
    } catch (err) {
      console.error(err);
      setError('Falha ao conectar com o Google Sheets. Verifique a URL.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadTransactions();
    }
  }, [currentUser]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'user'>) => {
    const newTx: Transaction = {
      ...transaction,
      id: Math.random().toString(36).substr(2, 9),
      user: currentUser?.username || 'unknown',
    };

    // Optimistic update
    setTransactions(prev => [newTx, ...prev]);
    setIsLoading(true);

    try {
      // Send to Google Sheets
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Avoids CORS preflight
        },
        body: JSON.stringify(newTx)
      });
      // Optionally reload to ensure sync
      // await loadTransactions();
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar no Google Sheets.');
      // Revert optimistic update on error
      setTransactions(prev => prev.filter(t => t.id !== newTx.id));
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-md text-white p-4 shadow-md flex justify-between items-center border-b border-slate-800/50 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Fuel className="text-amber-500" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">Controle de Diesel</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-200">{currentUser.username}</p>
            <p className="text-xs text-amber-500/80 uppercase tracking-wider">{currentUser.role === 'admin' ? 'Administrador' : 'Operador'}</p>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-rose-500/10 rounded-full transition-colors text-slate-400 hover:text-rose-400" title="Sair">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full relative">
        {error && (
          <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-3 text-rose-400">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute top-4 right-4 flex items-center gap-2 text-amber-500 bg-slate-900 p-2 rounded-lg shadow-lg border border-slate-800 z-10">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-medium">Sincronizando...</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Dashboard transactions={transactions} onAdd={addTransaction} role={currentUser.role} />
            </motion.div>
          )}
          {currentView === 'reports' && currentUser.role === 'admin' && (
            <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Reports transactions={transactions} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-t border-slate-800/50 p-2 sm:p-4 flex justify-center gap-4 sm:gap-8 shadow-[0_-4px_20px_-1px_rgba(0,0,0,0.3)] sticky bottom-0 z-20">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center p-2 rounded-xl transition-all min-w-[80px] ${currentView === 'dashboard' ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
        >
          <Home size={24} />
          <span className="text-xs font-medium mt-1">Início</span>
        </button>
        {currentUser.role === 'admin' && (
          <button 
            onClick={() => setCurrentView('reports')}
            className={`flex flex-col items-center p-2 rounded-xl transition-all min-w-[80px] ${currentView === 'reports' ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            <FileText size={24} />
            <span className="text-xs font-medium mt-1">Relatórios</span>
          </button>
        )}
      </nav>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: {username: string, role: UserRole}) => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const normalizedUser = user.trim().toLowerCase();
    const foundUser = USERS[normalizedUser];
    
    if (foundUser && foundUser.password === pass) {
      // Capitalize first letter for display
      const displayUser = normalizedUser.charAt(0).toUpperCase() + normalizedUser.slice(1);
      onLogin({ username: displayUser, role: foundUser.role });
    } else {
      setError('Usuário ou senha incorretos');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-md border border-slate-800/50 relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/5 p-5 rounded-2xl mb-6 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <Fuel size={48} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent tracking-tight">Controle de Diesel</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide uppercase">Acesso Restrito</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-sm">
              <AlertCircle size={16} />
              <p>{error}</p>
            </motion.div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Usuário</label>
            <input 
              type="text" 
              required
              value={user}
              onChange={e => setUser(e.target.value)}
              className="w-full p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-slate-100 placeholder-slate-600 shadow-inner"
              placeholder="Digite seu usuário"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Senha</label>
            <input 
              type="password" 
              required
              value={pass}
              onChange={e => setPass(e.target.value)}
              className="w-full p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-slate-100 placeholder-slate-600 shadow-inner"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-8 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transform hover:-translate-y-0.5"
          >
            <LogIn size={20} />
            Entrar no Sistema
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">v2.0.0 - Build 2026.03</p>
        </div>
      </motion.div>
    </div>
  );
}

function Dashboard({ transactions, onAdd, role }: { transactions: Transaction[], onAdd: (tx: Omit<Transaction, 'id' | 'user'>) => void, role: UserRole }) {
  const balance = transactions.reduce((acc, curr) => curr.type === 'in' ? acc + curr.amount : acc - curr.amount, 0);
  const [showModal, setShowModal] = useState<TransactionType | null>(null);
  const [showRecent, setShowRecent] = useState(false);

  return (
    <div className="space-y-6">
      {/* Balance Card - Only for Admin */}
      {role === 'admin' && (
        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-slate-800/50 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
          <h2 className="text-slate-400 font-medium mb-3 uppercase tracking-widest text-sm">Saldo Atual no Tanque</h2>
          <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 flex items-baseline gap-2 drop-shadow-sm">
            {balance.toLocaleString('pt-BR')} <span className="text-2xl text-amber-500 font-bold">L</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={`grid gap-4 ${role === 'admin' ? 'grid-cols-2' : 'grid-cols-1 max-w-md mx-auto mt-12'}`}>
        {role === 'admin' && (
          <button 
            onClick={() => setShowModal('in')}
            className="group bg-slate-900/40 backdrop-blur-md hover:bg-emerald-500/10 border border-slate-800/50 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
          >
            <div className="bg-slate-800/50 group-hover:bg-emerald-500/20 p-4 rounded-full transition-colors">
              <PlusCircle size={36} className="text-emerald-500" />
            </div>
            <span className="font-bold tracking-wide">Registrar Entrada</span>
          </button>
        )}
        <button 
          onClick={() => setShowModal('out')}
          className="group bg-slate-900/40 backdrop-blur-md hover:bg-rose-500/10 border border-slate-800/50 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]"
        >
          <div className="bg-slate-800/50 group-hover:bg-rose-500/20 p-4 rounded-full transition-colors">
            <MinusCircle size={36} className="text-rose-500" />
          </div>
          <span className="font-bold tracking-wide">Registrar Saída</span>
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl shadow-lg border border-slate-800/50 overflow-hidden mt-8">
        <div className="p-5 border-b border-slate-800/50 bg-slate-900/40 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 tracking-wide">Movimentações Recentes</h3>
          <button 
            onClick={() => setShowRecent(!showRecent)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
          >
            {showRecent ? <Minus size={20} /> : <Plus size={20} />}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {showRecent && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="divide-y divide-slate-800">
                {transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {tx.type === 'in' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{tx.description}</p>
                        <p className="text-xs text-slate-500">{parseDate(tx.date).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className={`font-bold ${tx.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'in' ? '+' : '-'}{tx.amount} L
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="p-8 text-center text-slate-500">Nenhuma movimentação registrada.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <TransactionModal 
            type={showModal} 
            onClose={() => setShowModal(null)} 
            onSubmit={(tx) => { onAdd(tx); setShowModal(null); }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TransactionModal({ type, onClose, onSubmit }: { type: TransactionType, onClose: () => void, onSubmit: (tx: Omit<Transaction, 'id' | 'user'>) => void }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  // Helper to get local datetime string for input
  const getLocalDatetime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [date, setDate] = useState(getLocalDatetime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description && date) {
      onSubmit({
        type,
        amount: Number(amount),
        description,
        date: new Date(date).toISOString()
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-800/50"
      >
        <div className={`p-5 text-white font-bold tracking-wide flex justify-between items-center ${type === 'in' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-rose-600 to-rose-500'}`}>
          <span>{type === 'in' ? 'Nova Entrada de Diesel' : 'Nova Saída de Diesel'}</span>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Data e Hora</label>
            <input 
              type="datetime-local" 
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-100 placeholder-slate-600 shadow-inner"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Quantidade (Litros)</label>
            <input 
              type="number" 
              required
              min="1"
              step="0.1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-100 placeholder-slate-600 shadow-inner"
              placeholder="Ex: 500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              {type === 'in' ? 'Fornecedor / Nota Fiscal' : 'Motivo / Gerador Destino'}
            </label>
            <input 
              type="text" 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-100 placeholder-slate-600 shadow-inner"
              placeholder={type === 'in' ? 'Ex: Posto Ipiranga NF 1234' : 'Ex: Abastecimento Gerador 01'}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 px-4 border border-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" className={`flex-1 py-4 px-4 text-white rounded-xl font-bold transition-all shadow-lg ${type === 'in' ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]'}`}>
              Salvar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Reports({ transactions }: { transactions: Transaction[] }) {
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    
    if (startDate) {
      const txDate = parseDate(tx.date);
      const start = new Date(startDate);
      if (txDate < start) return false;
    }
    
    if (endDate) {
      const txDate = parseDate(tx.date);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of the day
      if (txDate > end) return false;
    }
    
    return true;
  });

  const totalIn = filteredTransactions.filter(t => t.type === 'in').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOut = filteredTransactions.filter(t => t.type === 'out').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIn - totalOut;

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Data,Tipo,Quantidade (L),Descricao,Usuario\n"
      + filteredTransactions.map(e => `${parseDate(e.date).toLocaleString('pt-BR')},${e.type === 'in' ? 'Entrada' : 'Saida'},${e.amount},${e.description},${e.user}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_diesel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text("Relatório de Controle de Diesel", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
    
    // Summary
    doc.text(`Total Entradas: ${totalIn.toLocaleString('pt-BR')} L`, 14, 38);
    doc.text(`Total Saídas: ${totalOut.toLocaleString('pt-BR')} L`, 14, 44);
    doc.text(`Saldo Final: ${balance.toLocaleString('pt-BR')} L`, 14, 50);

    // Table
    const tableData = filteredTransactions.map(tx => [
      parseDate(tx.date).toLocaleString('pt-BR'),
      tx.type === 'in' ? 'Entrada' : 'Saída',
      `${tx.type === 'in' ? '+' : '-'}${tx.amount}`,
      tx.description,
      tx.user
    ]);

    autoTable(doc, {
      startY: 58,
      head: [['Data/Hora', 'Tipo', 'Qtd (L)', 'Descrição', 'Usuário']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }, // slate-900
      styles: { fontSize: 9 },
    });

    doc.save("relatorio_diesel.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent tracking-tight">Relatórios</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleExportCSV} className="flex-1 sm:flex-none bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
            <FileDown size={18} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={handleExportPDF} className="flex-1 sm:flex-none bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
            <Download size={18} />
            <span className="hidden sm:inline">Salvar PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Movimentação</label>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-100 text-sm"
          >
            <option value="all">Todas</option>
            <option value="in">Apenas Entradas</option>
            <option value="out">Apenas Saídas</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-1">Data Inicial</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-100 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-1">Data Final</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-100 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <p className="text-sm text-slate-400 mb-1">Total Entradas</p>
          <p className="text-2xl font-bold text-emerald-400">{totalIn.toLocaleString('pt-BR')} L</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <p className="text-sm text-slate-400 mb-1">Total Saídas</p>
          <p className="text-2xl font-bold text-rose-400">{totalOut.toLocaleString('pt-BR')} L</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <p className="text-sm text-slate-400 mb-1">Saldo Final</p>
          <p className="text-2xl font-bold text-slate-100">{balance.toLocaleString('pt-BR')} L</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 font-medium">Data/Hora</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Usuário</th>
                <th className="p-4 font-medium text-right">Qtd (L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-800/50">
                  <td className="p-4 text-slate-400 whitespace-nowrap">{parseDate(tx.date).toLocaleString('pt-BR')}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {tx.type === 'in' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-200">{tx.description}</td>
                  <td className="p-4 text-slate-400">{tx.user}</td>
                  <td className={`p-4 text-right font-medium ${tx.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'in' ? '+' : '-'}{tx.amount}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Sem dados para exibir com os filtros atuais.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

