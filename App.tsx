
import React, { useState, useMemo } from 'react';
import { FormCard } from './components/FormCard';
import { BRANCH_SALES_MAPPING, CATEGORIES, GINZA_LOGO_URL } from './constants';
import { FormData, ExpenseCategory } from './types';
import { submitToGoogleSheets } from './services/googleSheetsService';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    expenseDate: new Date().toISOString().split('T')[0],
    branchName: '',
    salespersonName: '',
    categories: [],
    travelEntries: [],
    foodEntries: [],
    accommodationEntries: [],
    otherEntries: [],
    remark: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const categorySubtotals = useMemo(() => {
    return {
      Travel: formData.travelEntries.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
      Food: formData.foodEntries.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
      Accommodation: formData.accommodationEntries.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
      Other: formData.otherEntries.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
    };
  }, [formData.travelEntries, formData.foodEntries, formData.accommodationEntries, formData.otherEntries]);

  const grandTotal = useMemo(() => {
    return Object.keys(categorySubtotals).reduce((sum, key) => {
      return formData.categories.includes(key as ExpenseCategory) 
        ? sum + categorySubtotals[key as keyof typeof categorySubtotals] 
        : sum;
    }, 0);
  }, [categorySubtotals, formData.categories]);

  const handleCategoryToggle = (category: ExpenseCategory) => {
    setFormData(prev => {
      const isSelected = prev.categories.includes(category);
      const newCategories = isSelected 
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];

      const updates: Partial<FormData> = { categories: newCategories };
      if (!isSelected) {
        const initialRow = { id: crypto.randomUUID(), date: prev.expenseDate, amount: '', attachment: null };
        if (category === 'Travel') updates.travelEntries = [{ ...initialRow, from: '', to: '' }];
        if (category === 'Food') updates.foodEntries = [initialRow];
        if (category === 'Accommodation') updates.accommodationEntries = [initialRow];
        if (category === 'Other') updates.otherEntries = [initialRow];
      } else {
        if (category === 'Travel') updates.travelEntries = [];
        if (category === 'Food') updates.foodEntries = [];
        if (category === 'Accommodation') updates.accommodationEntries = [];
        if (category === 'Other') updates.otherEntries = [];
      }
      return { ...prev, ...updates };
    });
  };

  const addRow = (type: 'travel' | 'food' | 'accommodation' | 'other') => {
    setFormData(prev => {
      const common = { id: crypto.randomUUID(), date: prev.expenseDate, amount: '', attachment: null };
      if (type === 'travel') return { ...prev, travelEntries: [...prev.travelEntries, { ...common, from: '', to: '' }] };
      if (type === 'food') return { ...prev, foodEntries: [...prev.foodEntries, common] };
      if (type === 'accommodation') return { ...prev, accommodationEntries: [...prev.accommodationEntries, common] };
      return { ...prev, otherEntries: [...prev.otherEntries, common] };
    });
  };

  const updateEntry = (type: string, id: string, field: string, value: any) => {
    setFormData(prev => {
      const key = `${type}Entries` as keyof FormData;
      const list = prev[key] as any[];
      const newList = list.map(item => item.id === id ? { ...item, [field]: value } : item);
      return { ...prev, [key]: newList };
    });
  };

  const removeRow = (type: string, id: string) => {
    setFormData(prev => {
      const key = `${type}Entries` as keyof FormData;
      const list = prev[key] as any[];
      if (list.length <= 1) return prev; 
      return { ...prev, [key]: list.filter(item => item.id !== id) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branchName || !formData.salespersonName) {
      alert("Please select Branch and Salesperson name.");
      return;
    }
    setIsSubmitting(true);
    const success = await submitToGoogleSheets(formData);
    setIsSubmitting(false);
    if (success) setIsSuccess(true);
    else alert("Submission completed. Please check your Google Sheet.");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <FormCard isMain>
          <div className="flex justify-center mb-6">
             <img src={GINZA_LOGO_URL} alt="GINZA" className="h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-black mb-4 text-center text-gray-900 uppercase tracking-tighter">Response Sent</h1>
          <div className="bg-indigo-50 p-10 rounded-[2.5rem] border-4 border-indigo-100 mb-8 text-center">
            <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-2">Grand Total Logged</span>
            <span className="text-5xl font-black text-indigo-900 tracking-tighter">{formatCurrency(grandTotal)}</span>
          </div>
          <div className="text-center">
            <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-12 py-5 rounded-full font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95">
              Submit New Response
            </button>
          </div>
        </FormCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Header with Logo */}
      <div className="bg-white rounded-lg shadow-sm mb-4 border border-gray-200 overflow-hidden google-form-card">
        <div className="h-64 w-full relative">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200" 
            alt="Corporate Header" 
            className="w-full h-full object-cover grayscale brightness-[0.3]"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-4 rounded-3xl shadow-2xl mb-5 transform hover:scale-105 transition-all">
               <img src={GINZA_LOGO_URL} alt="GINZA" className="h-24 w-auto object-contain" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tighter uppercase drop-shadow-2xl">
              GINZA INDUSTRIES LIMITED
            </h1>
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.6em] text-indigo-400 font-black mt-3 drop-shadow-lg">
              EXPENSE MANAGEMENT PORTAL
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info Section */}
        <FormCard>
          <div className="space-y-10">
            <div>
              <label className="block text-[14px] font-black text-gray-900 uppercase tracking-widest mb-4">
                Expense Date
              </label>
              <input type="date" readOnly value={formData.expenseDate} className="w-full sm:w-1/2 border-b-4 border-gray-100 py-3 outline-none bg-gray-50/50 font-mono text-sm font-black text-gray-900 px-4 rounded-t-xl" />
            </div>

            <div>
              <label className="block text-[14px] font-black text-gray-900 uppercase tracking-widest mb-4">
                Select Branch Name *
              </label>
              <select required value={formData.branchName} onChange={(e) => setFormData({ ...formData, branchName: e.target.value, salespersonName: '' })} className="w-full sm:w-1/2 border-b-4 border-gray-100 py-4 focus:border-indigo-600 outline-none bg-transparent text-sm font-black text-indigo-900 cursor-pointer appearance-none hover:bg-gray-50 px-4 rounded-t-xl transition-all">
                <option value="">-- CHOOSE BRANCH --</option>
                {Object.keys(BRANCH_SALES_MAPPING).map(branch => <option key={branch} value={branch}>{branch}</option>)}
              </select>
            </div>

            {formData.branchName && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[14px] font-black text-gray-900 uppercase tracking-widest mb-4">
                  Salesperson Name *
                </label>
                <select required value={formData.salespersonName} onChange={(e) => setFormData({ ...formData, salespersonName: e.target.value })} className="w-full sm:w-1/2 border-b-4 border-gray-100 py-4 focus:border-indigo-600 outline-none bg-transparent text-sm font-black text-indigo-900 cursor-pointer appearance-none hover:bg-gray-50 px-4 rounded-t-xl transition-all">
                  <option value="">-- CHOOSE SALESPERSON --</option>
                  {BRANCH_SALES_MAPPING[formData.branchName].map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            )}
          </div>
        </FormCard>

        {/* Categories Section */}
        <FormCard>
          <label className="block text-[14px] font-black text-gray-900 uppercase tracking-widest mb-8 text-center">
            Select Expense Categories
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {CATEGORIES.map(cat => (
              <label key={cat} className={`flex flex-col items-center justify-center gap-4 cursor-pointer p-6 rounded-[2.5rem] border-2 transition-all duration-300 text-center ${formData.categories.includes(cat as ExpenseCategory) ? 'border-indigo-600 bg-indigo-50 shadow-xl ring-4 ring-indigo-100 scale-105' : 'border-gray-50 hover:bg-gray-50'}`}>
                <input type="checkbox" checked={formData.categories.includes(cat as ExpenseCategory)} onChange={() => handleCategoryToggle(cat as ExpenseCategory)} className="hidden" />
                <div className={`text-5xl transition-all ${formData.categories.includes(cat as ExpenseCategory) ? 'grayscale-0' : 'grayscale opacity-20'}`}>
                  {cat === 'Travel' && '🚗'}
                  {cat === 'Food' && '🍱'}
                  {cat === 'Accommodation' && '🏢'}
                  {cat === 'Other' && '📁'}
                </div>
                <span className={`text-[12px] font-black tracking-widest uppercase ${formData.categories.includes(cat as ExpenseCategory) ? 'text-indigo-900' : 'text-gray-400'}`}>{cat}</span>
              </label>
            ))}
          </div>
        </FormCard>

        {/* Travel Log Section */}
        {formData.categories.includes('Travel') && (
          <FormCard>
            <div className="flex justify-between items-center mb-10 border-b-4 border-gray-100 pb-5">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">🚗 Travel Details</h2>
              <span className="text-[12px] font-black text-white bg-indigo-600 px-6 py-2.5 rounded-full shadow-lg">{formatCurrency(categorySubtotals.Travel)}</span>
            </div>
            <div className="space-y-12">
              {formData.travelEntries.map((entry) => (
                <div key={entry.id} className="p-8 border-2 border-gray-100 rounded-[3rem] bg-gray-50/50 relative group transition-all hover:bg-white hover:shadow-2xl">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                      <div>
                        <label className="text-[14px] font-black text-gray-900 uppercase tracking-widest mb-3 block">Expense Date</label>
                        <input type="date" value={entry.date} onChange={(e) => updateEntry('travel', entry.id, 'date', e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none text-sm font-black shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[14px] font-black text-gray-900 uppercase tracking-widest mb-3 block">Origin (From)</label>
                        <input type="text" placeholder="Starting point" value={entry.from} onChange={(e) => updateEntry('travel', entry.id, 'from', e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none text-sm font-black shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[14px] font-black text-gray-900 uppercase tracking-widest mb-3 block">Destination (To)</label>
                        <input type="text" placeholder="Destination" value={entry.to} onChange={(e) => updateEntry('travel', entry.id, 'to', e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none text-sm font-black shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[14px] font-black text-gray-900 uppercase tracking-widest mb-3 block">Amount (₹)</label>
                        <input type="number" placeholder="0.00" value={entry.amount} onChange={(e) => updateEntry('travel', entry.id, 'amount', e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none text-sm font-black text-indigo-900 shadow-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[14px] font-black text-gray-900 uppercase tracking-widest mb-4 block">Attachment (Ticket/Bill)</label>
                        <div className="flex items-center gap-5 bg-white p-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 transition-all cursor-pointer">
                          <input type="file" onChange={(e) => updateEntry('travel', entry.id, 'attachment', e.target.files?.[0])} className="text-[12px] text-gray-900 font-black file:mr-6 file:py-3 file:px-10 file:rounded-xl file:border-0 file:text-[12px] file:font-black file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-600 hover:file:text-white cursor-pointer w-full" />
                          {entry.attachment && <span className="text-[11px] font-black text-green-600 bg-green-50 px-5 py-2 rounded-xl whitespace-nowrap border border-green-100 shadow-sm">✅ UPLOADED</span>}
                        </div>
                      </div>
                   </div>
                   {formData.travelEntries.length > 1 && (
                     <button type="button" onClick={() => removeRow('travel', entry.id)} className="absolute -top-5 -right-5 bg-white text-gray-300 hover:text-red-500 shadow-2xl border-2 border-gray-100 rounded-full p-4 transition-all hover:scale-110 z-10">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                   )}
                </div>
              ))}
              <button type="button" onClick={() => addRow('travel')} className="w-full py-8 border-4 border-dashed border-gray-100 rounded-[3.5rem] text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-black text-[14px] uppercase tracking-[0.5em] flex justify-center items-center gap-6 shadow-sm active:translate-y-1">
                <span className="text-4xl">+</span> ADD NEW TRAVEL ENTRY
              </button>
            </div>
          </FormCard>
        )}

        {/* Other Sections Handler */}
        {['Food', 'Accommodation', 'Other'].map(type => {
          const cat = type as ExpenseCategory;
          if (!formData.categories.includes(cat)) return null;
          const entriesKey = `${type.toLowerCase()}Entries` as keyof FormData;
          const entries = formData[entriesKey] as any[];
          const color = type === 'Food' ? 'orange' : type === 'Accommodation' ? 'blue' : 'emerald';
          const icon = type === 'Food' ? '🍱' : type === 'Accommodation' ? '🏢' : '📁';

          return (
            <FormCard key={type}>
              <div className="flex justify-between items-center mb-10 border-b-4 border-gray-100 pb-5">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{icon} {type.toUpperCase()} BILLS</h2>
                <span className={`text-[12px] font-black text-white bg-${color}-600 px-6 py-2.5 rounded-full shadow-lg`}>{formatCurrency(categorySubtotals[cat as keyof typeof categorySubtotals])}</span>
              </div>
              <div className="space-y-12">
                {entries.map((entry) => (
                  <div key={entry.id} className={`p-8 border-2 border-gray-100 rounded-[3rem] bg-gray-50/50 relative group transition-all hover:bg-white hover:shadow-2xl`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div>
                          <label className="text-[14px] font-black text-gray-900 uppercase tracking-widest mb-3 block">Expense Date</label>
                          <input type="date" value={entry.date} onChange={(e) => updateEntry(type.toLowerCase(), entry.id, 'date', e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-black shadow-sm" />
                       </div>
                       <div>
                          <label className="text-[14px] font-black text-gray-900 uppercase tracking-widest mb-3 block">Bill Amount (₹)</label>
                          <input type="number" placeholder="0.00" value={entry.amount} onChange={(e) => updateEntry(type.toLowerCase(), entry.id, 'amount', e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-black text-gray-900 shadow-sm" />
                       </div>
                       <div className="md:col-span-2">
                          <label className="text-[14px] font-black text-gray-900 uppercase tracking-widest mb-4 block">Attachment</label>
                          <div className="flex items-center gap-5 bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-500 transition-all">
                            <input type="file" onChange={(e) => updateEntry(type.toLowerCase(), entry.id, 'attachment', e.target.files?.[0])} className="text-[12px] text-gray-900 font-black file:mr-6 file:py-3 file:px-10 file:rounded-xl file:border-0 file:text-[12px] file:font-black file:bg-gray-100 file:text-gray-600 hover:file:bg-indigo-600 hover:file:text-white cursor-pointer w-full" />
                            {entry.attachment && <span className="text-[11px] font-black text-green-600 bg-green-50 px-5 py-2 rounded-xl whitespace-nowrap shadow-sm border border-green-100">✅ LINKED</span>}
                          </div>
                       </div>
                    </div>
                    {entries.length > 1 && (
                      <button type="button" onClick={() => removeRow(type.toLowerCase(), entry.id)} className="absolute -top-5 -right-5 bg-white text-gray-300 hover:text-red-500 shadow-2xl border-2 border-gray-100 rounded-full p-4 transition-all z-10">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addRow(type.toLowerCase() as any)} className="w-full py-8 border-4 border-dashed border-gray-100 rounded-[3.5rem] text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-black text-[14px] uppercase tracking-[0.5em] flex justify-center items-center gap-6 shadow-sm active:translate-y-1">
                  <span className="text-4xl">+</span> ADD NEW {type.toUpperCase()} ENTRY
                </button>
              </div>
            </FormCard>
          );
        })}

        {/* Remarks Section */}
        <FormCard>
           <label className="block text-[14px] font-black text-gray-900 uppercase tracking-widest mb-5 ml-1 flex items-center gap-4">
             <div className="bg-indigo-100 p-2.5 rounded-xl shadow-sm">
               <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
             </div>
             Description / Purpose / Remarks
           </label>
           <textarea 
            rows={5}
            value={formData.remark}
            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            placeholder="Provide a detailed official reason for these expenditures..."
            className="w-full bg-gray-50/50 border-4 border-transparent border-b-gray-100 py-8 px-8 focus:border-indigo-600 focus:bg-white outline-none transition-all resize-none text-sm font-black rounded-t-[3.5rem] shadow-inner placeholder-gray-300"
           />
        </FormCard>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center pb-32 gap-12 mt-12">
           <button 
            type="submit" 
            disabled={isSubmitting || grandTotal === 0}
            className={`w-full sm:w-auto px-36 py-10 rounded-[5rem] text-white font-black text-3xl shadow-2xl transition-all duration-300 flex items-center justify-center gap-10 ${isSubmitting || grandTotal === 0 ? 'bg-gray-200 cursor-not-allowed text-gray-400 shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-2 active:scale-95 shadow-indigo-200/80'}`}
           >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-10 w-10 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                SAVING...
              </>
            ) : (
              <>
                SUBMIT RESPONSE
                <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </>
            )}
           </button>
           <button 
             type="button" 
             onClick={() => confirm('Reset form?') && window.location.reload()} 
             className="text-gray-400 hover:text-red-600 font-black text-[14px] uppercase tracking-[0.6em] transition-all flex items-center gap-8 group px-12 py-7 hover:bg-red-50 rounded-full"
           >
             <svg className="w-10 h-10 transition-transform group-hover:rotate-180 duration-1000" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             CLEAR FORM
           </button>
        </div>
      </form>
      
      <footer className="text-center pb-24 opacity-80 border-t-4 border-gray-100 pt-24 px-10">
           <p className="text-[18px] text-gray-900 font-black uppercase tracking-[1em] mb-5">
             Ginza Industries Limited
           </p>
           <p className="text-[13px] text-gray-400 font-bold uppercase tracking-[0.4em]">
             Authorized Corporate Expense System &copy; {new Date().getFullYear()}
           </p>
      </footer>
    </div>
  );
};

export default App;
