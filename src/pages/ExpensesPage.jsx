import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const ExpensesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initial empty rows
  const [rows, setRows] = useState([]);

  const reasons = [
    "Milk", "Vegetables", "Groceries", "Staff-Expense", "Electricity bill",
    "Gas", "Maintenance", "Other", "Cold Drink", "Paneer", "Momos",
    "Disposable", "Ice Cream", "Buns", "Void", "Home", "Raw material",
    "Mozzarella cheese", "Blend"
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Initialize rows once employees are loaded (to get current user ID) or when date changes
  useEffect(() => {
    if (employees.length > 0) {
        fetchExistingExpenses(date);
    }
  }, [date, employees]);

  const fetchEmployees = async () => {
    try {
      const users = await window.electronAPI.invoke('users:getAll');
      setEmployees(users || []);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const createEmptyRow = () => ({
    reason: '',
    amount: '',
    explanation: '',
    employee_id: user?.id || '', // Auto-select current user
    paid_from: 'cash'
  });

  const fetchExistingExpenses = async (selectedDate) => {
    setLoading(true);
    try {
      const existing = await window.electronAPI.invoke('expenses:getByDate', { date: selectedDate });
      
      if (existing && existing.length > 0) {
        const mapped = existing.map(e => ({
          id: e.id,
          reason: e.reason,
          amount: e.amount,
          explanation: e.explanation,
          employee_id: e.employee_id,
          paid_from: e.paid_from
        }));
        
        const padding = Math.max(0, 10 - mapped.length);
        const emptyRows = Array(padding).fill().map(createEmptyRow);
        
        setRows([...mapped, ...emptyRows]);
      } else {
        setRows(Array(10).fill().map(createEmptyRow));
      }
    } catch (error) {
      console.error("Failed to fetch expenses", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRows = () => {
    const newRows = Array(10).fill().map(createEmptyRow);
    setRows(prev => [...prev, ...newRows]);
  };

  const handleChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleDeleteRow = async (index) => {
    const row = rows[index];
    if (row.id) {
        if (!window.confirm("Are you sure you want to delete this saved expense?")) return;
        try {
            await window.electronAPI.invoke('expenses:delete', { id: row.id });
        } catch (error) {
            console.error("Failed to delete expense", error);
            alert("Failed to delete expense");
            return;
        }
    }
    
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
  };

  const handleSave = async () => {
    const validRows = rows.filter(r => r.reason && r.amount);
    
    if (validRows.length === 0) {
        alert("Please enter at least one expense with Reason and Amount.");
        return;
    }

    setSaving(true);
    try {
        const newRows = validRows.filter(r => !r.id);
        
        if (newRows.length === 0) {
            alert("No new changes to save.");
            setSaving(false);
            return;
        }

        const expensesToSave = newRows.map(r => ({
            ...r,
            date: date,
            employee_name: employees.find(e => e.id === r.employee_id)?.full_name || ''
        }));

        await window.electronAPI.invoke('expenses:create', { expenses: expensesToSave });
        
        alert("Expenses saved successfully!");
        fetchExistingExpenses(date);
    } catch (error) {
        console.error("Failed to save expenses", error);
        alert("Failed to save: " + error.message);
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 text-sm">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Expense Details</h1>
            <p className="text-xs text-gray-500">Manage daily expenses</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded border border-gray-300 shadow-sm">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wider">Date</span>
            <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="font-bold text-gray-800 border-none focus:ring-0 cursor-pointer p-0 text-sm"
            />
        </div>
      </div>

      {/* Warning/Note */}
      <div className="px-4 py-1.5 bg-blue-50 text-blue-800 text-xs border-b border-blue-100 flex justify-between items-center flex-shrink-0">
        <span><strong>Note:</strong> Only rows with both <u>Reason</u> & <u>Amount</u> will be saved.</span>
        <span>Total Expenses: <strong>₹{rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0).toFixed(2)}</strong></span>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white shadow-sm border border-gray-300 min-w-[1000px] rounded overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 text-xs uppercase tracking-wider">
                <th className="p-3 border-r border-gray-300 w-12 text-center">#</th>
                <th className="p-3 border-r border-gray-300 w-48">Reason</th>
                <th className="p-3 border-r border-gray-300 w-32">Amount (₹)</th>
                <th className="p-3 border-r border-gray-300">Explanation</th>
                <th className="p-3 border-r border-gray-300 w-48">Employee</th>
                <th className="p-3 border-r border-gray-300 w-32">Paid From</th>
                <th className="p-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, index) => (
                <tr key={index} className={`hover:bg-blue-50/50 group transition-colors ${row.id ? 'bg-green-50/40' : ''}`}>
                  {/* Serial # */}
                  <td className="p-2 border-r border-gray-200 text-center text-gray-400 text-xs">
                    {index + 1}
                  </td>

                  {/* Reason */}
                  <td className="p-0 border-r border-gray-200 h-10">
                    {row.id ? (
                        <div className="px-3 py-2 truncate font-medium text-gray-700">{row.reason}</div>
                    ) : (
                        <select 
                            className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-gray-800 text-sm appearance-none"
                            value={row.reason}
                            onChange={(e) => handleChange(index, 'reason', e.target.value)}
                        >
                            <option value="">Select Reason</option>
                            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="p-0 border-r border-gray-200 h-10">
                    {row.id ? (
                        <div className="px-3 py-2 font-mono text-gray-800">₹{row.amount}</div>
                    ) : (
                        <input 
                            type="number" 
                            placeholder="0.00"
                            className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none font-mono text-sm"
                            value={row.amount}
                            onChange={(e) => handleChange(index, 'amount', e.target.value)}
                        />
                    )}
                  </td>

                  {/* Explanation */}
                  <td className="p-0 border-r border-gray-200 h-10">
                    {row.id ? (
                        <div className="px-3 py-2 text-gray-600 truncate">{row.explanation || '-'}</div>
                    ) : (
                        <input 
                            type="text" 
                            placeholder="Optional explanation..."
                            className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-sm"
                            value={row.explanation}
                            onChange={(e) => handleChange(index, 'explanation', e.target.value)}
                        />
                    )}
                  </td>

                  {/* Employee */}
                  <td className="p-0 border-r border-gray-200 h-10">
                    {row.id ? (
                        <div className="px-3 py-2 text-gray-700 truncate">
                             {employees.find(e => e.id === row.employee_id)?.full_name || 'Unknown'}
                        </div>
                    ) : (
                        <select 
                            className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-gray-700 text-sm appearance-none"
                            value={row.employee_id}
                            onChange={(e) => handleChange(index, 'employee_id', e.target.value)}
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                            ))}
                        </select>
                    )}
                  </td>

                  {/* Paid From */}
                  <td className="p-0 border-r border-gray-200 h-10">
                     {row.id ? (
                        <div className="px-3 py-2 text-gray-700 capitalize">{row.paid_from}</div>
                    ) : (
                        <select 
                            className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-gray-700 text-sm appearance-none"
                            value={row.paid_from}
                            onChange={(e) => handleChange(index, 'paid_from', e.target.value)}
                        >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                        </select>
                    )}
                  </td>

                  {/* Action */}
                  <td className="p-0 text-center h-10">
                     <button 
                        onClick={() => handleDeleteRow(index)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Delete Row"
                    >
                        <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-white border-t border-gray-200 p-3 flex justify-between items-center px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10 flex-shrink-0">
        <button 
            onClick={handleAddRows}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors text-sm"
        >
            <Plus size={16} />
            Add 10 Rows
        </button>

        <div className="flex gap-3">
            <button 
                onClick={() => navigate(-1)}
                className="px-5 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium transition-colors text-sm"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-2 bg-[#dc2626] hover:bg-red-700 text-white rounded font-medium transition-colors shadow-sm text-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Expenses'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ExpensesPage;
