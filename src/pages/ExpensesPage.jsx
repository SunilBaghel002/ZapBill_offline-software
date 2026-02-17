import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Calendar, AlertCircle } from 'lucide-react';
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
            setSaving(false);
            return;
        }

        const expensesToSave = newRows.map(r => ({
            ...r,
            date: date,
            employee_name: employees.find(e => e.id === r.employee_id)?.full_name || ''
        }));

        await window.electronAPI.invoke('expenses:create', { expenses: expensesToSave });
        
        // Silent success
        fetchExistingExpenses(date);
    } catch (error) {
        console.error("Failed to save expenses", error);
        alert("Failed to save: " + error.message);
    } finally {
        setSaving(false);
    }
  };

  const totalExpenses = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <button 
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-icon"
            style={{ borderRadius: '50%' }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-1)' }}>Expense Details</h1>
            <p style={{ color: 'var(--gray-500)' }}>Manage daily store expenses</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            {/* Total Badge */}
            <div className="card" style={{ padding: 'var(--spacing-2) var(--spacing-4)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', background: 'var(--primary-50)', border: '1px solid var(--primary-100)' }}>
                <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>Total:</span>
                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--primary-700)' }}>₹{totalExpenses.toFixed(2)}</span>
            </div>

            {/* Date Picker */}
            <div className="card" style={{ padding: 'var(--spacing-2) var(--spacing-4)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <Calendar size={18} style={{ color: 'var(--gray-500)' }} />
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--gray-700)', fontFamily: 'inherit' }}
                />
            </div>
        </div>
      </div>

      {/* Info Warning */}
      <div style={{ marginBottom: 'var(--spacing-6)', padding: 'var(--spacing-3) var(--spacing-4)', background: 'var(--info-50)', border: '1px solid var(--info-100)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', color: 'var(--info-700)', fontSize: 'var(--font-size-sm)' }}>
        <AlertCircle size={18} />
        <span>Only rows with both <strong>Reason</strong> & <strong>Amount</strong> will be saved. Empty rows are ignored.</span>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>#</th>
              <th style={{ width: '20%' }}>Reason</th>
              <th style={{ width: '15%' }}>Amount (₹)</th>
              <th style={{ width: '25%' }}>Explanation</th>
              <th style={{ width: '15%' }}>Employee</th>
              <th style={{ width: '15%' }}>Paid From</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} style={{ backgroundColor: row.id ? 'var(--success-50)' : 'white' }}>
                {/* Serial # */}
                <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 'var(--font-size-xs)' }}>
                  {index + 1}
                </td>

                {/* Reason */}
                <td style={{ padding: 'var(--spacing-2) var(--spacing-3)' }}>
                    {row.id ? (
                        <div style={{ fontWeight: 500 }}>{row.reason}</div>
                    ) : (
                        <select 
                            className="input select"
                            value={row.reason}
                            onChange={(e) => handleChange(index, 'reason', e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">Select Reason</option>
                            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    )}
                </td>

                {/* Amount */}
                <td style={{ padding: 'var(--spacing-2) var(--spacing-3)' }}>
                    {row.id ? (
                        <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>₹{row.amount}</div>
                    ) : (
                        <input 
                            type="number" 
                            placeholder="0.00"
                            className="input"
                            value={row.amount}
                            onChange={(e) => handleChange(index, 'amount', e.target.value)}
                            style={{ width: '100%' }}
                        />
                    )}
                </td>

                {/* Explanation */}
                <td style={{ padding: 'var(--spacing-2) var(--spacing-3)' }}>
                    {row.id ? (
                        <div style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-sm)' }}>{row.explanation || '-'}</div>
                    ) : (
                        <input 
                            type="text" 
                            placeholder="Optional explanation..."
                            className="input"
                            value={row.explanation}
                            onChange={(e) => handleChange(index, 'explanation', e.target.value)}
                            style={{ width: '100%' }}
                        />
                    )}
                </td>

                {/* Employee */}
                <td style={{ padding: 'var(--spacing-2) var(--spacing-3)' }}>
                    {row.id ? (
                        <div style={{ fontSize: 'var(--font-size-sm)' }}>
                             {employees.find(e => e.id === row.employee_id)?.full_name || 'Unknown'}
                        </div>
                    ) : (
                        <select 
                            className="input select"
                            value={row.employee_id}
                            onChange={(e) => handleChange(index, 'employee_id', e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                            ))}
                        </select>
                    )}
                </td>

                {/* Paid From */}
                <td style={{ padding: 'var(--spacing-2) var(--spacing-3)' }}>
                     {row.id ? (
                        <div style={{ textTransform: 'capitalize' }}>{row.paid_from}</div>
                    ) : (
                        <select 
                            className="input select"
                            value={row.paid_from}
                            onChange={(e) => handleChange(index, 'paid_from', e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                        </select>
                    )}
                </td>

                {/* Action */}
                <td style={{ textAlign: 'center' }}>
                   <button 
                      onClick={() => handleDeleteRow(index)}
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'var(--error-500)' }}
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

      {/* Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-6)', paddingBottom: 'var(--spacing-10)' }}>
        <button 
            onClick={handleAddRows}
            className="btn btn-secondary"
        >
            <Plus size={16} />
            Add 10 Rows
        </button>

        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <button 
                onClick={() => navigate(-1)}
                className="btn btn-secondary"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ minWidth: '150px' }}
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
