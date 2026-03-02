import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const ExpensesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cashBalance, setCashBalance] = useState(0);

  // Initial empty rows
  const [rows, setRows] = useState([]);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  
  // Modal states
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [staffData, setStaffData] = useState({
    employee_name: '',
    amount: '',
    reason: 'Advance Salary',
    date: new Date().toISOString().split('T')[0]
  });

  const reasons = [
    "Milk", "Vegetables", "Groceries", "Staff-Expense", "Electricity bill",
    "Gas", "Maintenance", "Other", "Cold Drink", "Paneer", "Momos",
    "Disposable", "Ice Cream", "Buns", "Void", "Home", "Raw material",
    "Mozzarella cheese", "Blend", "Cash Withdrawal", "Staff Advance"
  ];

  const staffAdvanceReasons = [
    "Advance Salary", "Medical Emergency", "Travel/Petrol", "Incentive", "Personal Loan", "Bonus"
  ];

  useEffect(() => {
    fetchEmployees();
    fetchCashBalance();
  }, []);

  const fetchCashBalance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const report = await window.electronAPI.invoke('reports:daily', { date: today });
      if (report && report.sales) {
        const cash = (report.sales.opening_balance || 0) + (report.sales.cash_amount || 0) - (report.sales.total_expenses || 0);
        setCashBalance(cash);
      }
    } catch (error) {
      console.error("Failed to fetch cash balance", error);
    }
  };

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
          employee_name: e.employee_name,
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
        window.showAlert("Are you sure you want to delete this saved expense?", 'confirm', async () => {
            try {
                await window.electronAPI.invoke('expenses:delete', { id: row.id });
                const newRows = rows.filter((_, i) => i !== index);
                setRows(newRows);
                window.showAlert('Expense deleted successfully', 'success');
            } catch (error) {
                console.error("Failed to delete expense", error);
                window.showAlert("Failed to delete expense", 'error');
            }
        });
    } else {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
    }
  };

  const handleSave = async () => {
    const validRows = rows.filter(r => r.reason && r.amount);
    
    if (validRows.length === 0) {
        window.showAlert("Please enter at least one expense with Reason and Amount.");
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
        fetchCashBalance(); // Refresh balance after save
    } catch (error) {
        console.error("Failed to save expenses", error);
        window.showAlert("Failed to save: " + error.message);
    } finally {
        setSaving(false);
    }
  };

  const handleWithdrawalSave = async () => {
    if (!withdrawalAmount || isNaN(withdrawalAmount) || withdrawalAmount <= 0) return;
    
    if (parseFloat(withdrawalAmount) > cashBalance) {
      window.showAlert(`Insufficient Cash! Current Cash in Hand is ₹${cashBalance.toFixed(2)}. You cannot withdraw more than this.`);
      return;
    }

    setSaving(true);
    try {
      const expense = {
        reason: 'Cash Withdrawal',
        amount: parseFloat(withdrawalAmount),
        explanation: 'Cash withdrawn from drawer',
        employee_id: user?.id || '',
        employee_name: user?.full_name || user?.username || 'Admin',
        paid_from: 'cash',
        date: new Date().toISOString().split('T')[0]
      };
      const result = await window.electronAPI.invoke('expenses:create', { expenses: [expense] });
      setShowWithdrawalModal(false);
      setWithdrawalAmount('');
      fetchExistingExpenses(date);
      fetchCashBalance();
    } catch (error) {
      window.showAlert("Failed to save withdrawal");
    } finally {
      setSaving(false);
    }
  };

  const handleStaffAdvanceSave = async () => {
    if (!staffData.employee_name || !staffData.amount || isNaN(staffData.amount)) {
      window.showAlert("Please fill all fields");
      return;
    }

    if (parseFloat(staffData.amount) > cashBalance) {
      window.showAlert(`Insufficient Cash! Current Cash in Hand is ₹${cashBalance.toFixed(2)}. You cannot give advance more than this.`);
      return;
    }

    setSaving(true);
    try {
      const expense = {
        reason: 'Staff Advance',
        amount: parseFloat(staffData.amount),
        explanation: `Staff: ${staffData.employee_name} | Reason: ${staffData.reason}`,
        employee_id: user?.id, // ID of who gave it
        employee_name: staffData.employee_name, // Recipient Name
        paid_from: 'cash',
        date: staffData.date
      };
      await window.electronAPI.invoke('expenses:create', { expenses: [expense] });
      setShowStaffModal(false);
      setStaffData({
        employee_name: '',
        amount: '',
        reason: 'Advance Salary',
        date: new Date().toISOString().split('T')[0]
      });
      fetchExistingExpenses(date);
      fetchCashBalance();
    } catch (error) {
      window.showAlert("Failed to save staff advance");
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
            <button 
              onClick={() => setShowWithdrawalModal(true)}
              className="btn btn-secondary"
              style={{ background: 'var(--warning-50)', color: 'var(--warning-700)', borderColor: 'var(--warning-200)' }}
            >
              Cash Withdrawal
            </button>
            <button 
              onClick={() => setShowStaffModal(true)}
              className="btn btn-secondary"
              style={{ background: 'var(--info-50)', color: 'var(--info-700)', borderColor: 'var(--info-200)' }}
            >
              Staff
            </button>
            
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
                        row.reason === 'Staff Advance' || row.employee_name ? (
                          <div style={{ fontWeight: 500 }}>{row.employee_name || 'Staff Member'}</div>
                        ) : (
                          <div style={{ fontSize: 'var(--font-size-sm)' }}>
                            {employees.find(e => e.id === row.employee_id)?.full_name || 'Unknown'}
                          </div>
                        )
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

      {/* Premium Sticky Footer */}
      <div style={{ 
        position: 'sticky', 
        bottom: 0, 
        marginTop: 'var(--spacing-8)',
        padding: 'var(--spacing-4) 0',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--gray-100)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        zIndex: 10,
        margin: '0 -24px',
        paddingLeft: '24px',
        paddingRight: '24px'
      }}>
        <button 
            onClick={handleAddRows}
            className="btn btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: '12px',
              fontWeight: 600,
              background: 'white',
              border: '1px solid var(--gray-200)',
              boxShadow: 'var(--shadow-sm)'
            }}
        >
            <Plus size={18} style={{ color: 'var(--primary-500)' }} />
            Add More Rows
        </button>

        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <button 
                onClick={() => navigate(-1)}
                className="btn btn-ghost"
                style={{ fontWeight: 600, borderRadius: '12px' }}
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ 
                  minWidth: '180px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 12px rgba(0, 150, 255, 0.25)'
                }}
            >
                {saving ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'Saving...' : 'Save All Expenses'}
            </button>
        </div>
      </div>

      {/* Cash Withdrawal Modal */}
      {showWithdrawalModal && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowWithdrawalModal(false)}
        >
          <div className="card" style={{ width: '400px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>Cash Withdrawal</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Amount Withdrawal (₹)</label>
              <input 
                type="number"
                className="input"
                style={{ width: '100%', fontSize: '18px' }}
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowWithdrawalModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleWithdrawalSave} disabled={saving}>
                {saving ? 'Saving...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Advance Modal */}
      {showStaffModal && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowStaffModal(false)}
        >
          <div className="card" style={{ width: '450px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>Staff Advance</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Employee Name</label>
              <input 
                type="text"
                className="input"
                placeholder="Enter staff name..."
                style={{ width: '100%' }}
                value={staffData.employee_name}
                onChange={(e) => setStaffData({...staffData, employee_name: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Amount (₹)</label>
              <input 
                type="number"
                className="input"
                style={{ width: '100%' }}
                value={staffData.amount}
                onChange={(e) => setStaffData({...staffData, amount: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Reason</label>
              <select 
                className="input select"
                style={{ width: '100%' }}
                value={staffData.reason}
                onChange={(e) => setStaffData({...staffData, reason: e.target.value})}
              >
                {staffAdvanceReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Date</label>
              <input 
                type="date"
                className="input"
                style={{ width: '100%' }}
                value={staffData.date}
                onChange={(e) => setStaffData({...staffData, date: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowStaffModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStaffAdvanceSave} disabled={saving}>
                {saving ? 'Saving...' : 'Issue Advance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
