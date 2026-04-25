import { useState, useEffect, useMemo } from "react";
import { Plus, Users, ArrowRight, LogOut, Search, Activity, UserPlus, Trash2, DollarSign, PieChart as PieChartIcon, Edit2, TrendingUp, Download, Settings, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";

const COLORS = ['#6d28d9', '#3b82f6', '#d946ef', '#10b981', '#f59e0b', '#ef4444'];
const CATEGORY_ICONS = {
    Food: '🍔',
    Travel: '✈️',
    Shopping: '🛍️',
    Entertainment: '🎬',
    Utilities: '💡',
    General: '📝'
};

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState([]);
    
    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isSettlementOpen, setIsSettlementOpen] = useState(false);

    // Forms
    const [groupForm, setGroupForm] = useState({ name: '', description: '', currency: '$' });
    const [newMemberName, setNewMemberName] = useState("");
    const [expenseForm, setExpenseForm] = useState({
        id: null, description: '', amount: '', paidBy: '', category: 'General', splitType: 'EQUAL', participants: [], splitDetails: []
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");

    const handleAuthError = (error) => {
        if (error?.response?.status === 401) {
            localStorage.removeItem("user");
            navigate("/login");
        }
    };

    useEffect(() => {
        const userInfo = localStorage.getItem("user");
        if (!userInfo) navigate("/login");
        else {
            setUser(JSON.parse(userInfo));
            fetchGroups(JSON.parse(userInfo).token);
        }
    }, [navigate]);

    useEffect(() => {
        if (activeGroup && user) {
            fetchExpenses(activeGroup._id, user.token);
            fetchBalances(activeGroup._id, user.token);
        }
    }, [activeGroup, user]);

    const fetchGroups = async (token) => {
        try {
            const { data } = await axios.get("/api/groups", { headers: { Authorization: `Bearer ${token}` } });
            setGroups(data);
            if (data.length > 0) setActiveGroup(data[0]);
        } catch (error) {
            handleAuthError(error);
        }
    };

    const fetchExpenses = async (groupId, token) => {
        try {
            const { data } = await axios.get(`/api/expenses/group/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
            setExpenses(data);
        } catch (error) { handleAuthError(error); }
    };

    const fetchBalances = async (groupId, token) => {
        try {
            const { data } = await axios.get(`/api/groups/${groupId}/balances`, { headers: { Authorization: `Bearer ${token}` } });
            setBalances(data);
        } catch (error) { handleAuthError(error); }
    };

    // --- Actions ---
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post("/api/groups", { ...groupForm, creator: user._id }, { headers: { Authorization: `Bearer ${user.token}` } });
            const newGroup = data.group || data;
            setGroups([...groups, newGroup]);
            setActiveGroup(newGroup);
            setIsCreateModalOpen(false);
            setGroupForm({ name: '', description: '', currency: '$' });
            toast.success("Group created!");
        } catch (error) { toast.error(error.response?.data?.message || "Failed to create group"); }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post(`/api/groups/${activeGroup._id}/members`, { name: newMemberName }, { headers: { Authorization: `Bearer ${user.token}` } });
            setActiveGroup(data.group);
            setGroups(groups.map(g => g._id === data.group._id ? data.group : g));
            setIsAddMemberModalOpen(false);
            setNewMemberName("");
            fetchBalances(data.group._id, user.token);
            toast.success("Member added!");
        } catch (error) { toast.error(error.response?.data?.message || "Failed to add member"); }
    };

    const handleSaveExpense = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...expenseForm,
                amount: Number(expenseForm.amount),
                groupId: activeGroup._id
            };
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            
            if (expenseForm.id) {
                await axios.put(`/api/expenses/${expenseForm.id}`, payload, config);
                toast.success("Expense updated!");
            } else {
                await axios.post("/api/expenses", payload, config);
                toast.success("Expense added!");
            }
            
            fetchExpenses(activeGroup._id, user.token);
            fetchBalances(activeGroup._id, user.token);
            setIsExpenseModalOpen(false);
        } catch (error) { toast.error(error.response?.data?.message || "Failed to save expense"); }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        try {
            await axios.delete(`/api/expenses/${expenseId}`, { headers: { Authorization: `Bearer ${user.token}` } });
            setExpenses(expenses.filter(exp => exp._id !== expenseId));
            fetchBalances(activeGroup._id, user.token);
            toast.success("Expense deleted");
        } catch (error) { toast.error("Failed to delete expense"); }
    };

    const handleSettlePayment = async (debtor, creditor, amount) => {
        try {
            const payload = {
                description: `Settlement: ${debtor} paid ${creditor}`,
                amount: amount,
                paidBy: debtor,
                category: 'General',
                splitType: 'EXACT',
                participants: [creditor],
                splitDetails: [{ user: creditor, amount: amount }],
                groupId: activeGroup._id
            };
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post("/api/expenses", payload, config);
            
            toast.success("Payment recorded successfully");
            fetchExpenses(activeGroup._id, user.token);
            fetchBalances(activeGroup._id, user.token);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to record payment");
            console.error(error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text(`${activeGroup.name} - Expenses Report`, 14, 15);
        
        const tableColumn = ["Date", "Description", "Category", "Paid By", "Amount"];
        const tableRows = [];
        
        expenses.forEach(exp => {
            tableRows.push([
                new Date(exp.createdAt).toLocaleDateString(),
                exp.description,
                exp.category,
                exp.payer,
                `${activeGroup.currency}${exp.amount.toFixed(2)}`
            ]);
        });
        
        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
        doc.save(`${activeGroup.name}_expenses.pdf`);
        toast.success("Report exported!");
    };

    // --- Computed Data ---
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    const userNetBalance = balances.reduce((acc, curr) => {
        if (curr.to === user?.name) return acc + curr.amount; // Getting money
        if (curr.from === user?.name) return acc - curr.amount; // Owes money
        return acc;
    }, 0);

    const filteredExpenses = expenses.filter(exp => {
        const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = filterCategory === "All" || exp.category === filterCategory;
        return matchesSearch && matchesCat;
    });

    const pieData = useMemo(() => {
        const dataMap = {};
        expenses.forEach(e => {
            if (!dataMap[e.payer]) dataMap[e.payer] = 0;
            dataMap[e.payer] += e.amount;
        });
        return Object.keys(dataMap).map(k => ({ name: k, value: dataMap[k] }));
    }, [expenses]);

    if (!user) return null;

    return (
        <div className="flex h-screen bg-brand-dark text-white font-sans overflow-hidden selection:bg-brand-primary/30">
            {/* Background Orbs */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-neon/10 rounded-full blur-[150px] pointer-events-none"></div>

            {/* Sidebar */}
            <div className="w-80 glass-panel border-y-0 border-l-0 flex flex-col relative z-20 shadow-2xl">
                <div className="p-8 border-b border-brand-border/50">
                    <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-neon flex items-center gap-3">
                        <Activity className="w-8 h-8 text-brand-primary" />
                        Splitter
                    </h1>
                </div>

                <div className="p-6">
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center justify-between backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center font-bold text-lg shadow-lg">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 font-medium">Welcome back,</div>
                                <div className="font-semibold text-gray-100">{user.name}</div>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2 bg-white/5 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-6 custom-scrollbar">
                    <div className="flex justify-between items-center mb-4 mt-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Workspaces</span>
                        <span className="bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full text-xs font-bold">{groups.length}</span>
                    </div>

                    {groups.map(group => (
                        <button
                            key={group._id}
                            onClick={() => setActiveGroup(group)}
                            className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 ${
                                activeGroup?._id === group._id 
                                ? 'bg-brand-primary/20 border border-brand-primary/30 shadow-[0_0_20px_rgba(109,40,217,0.15)]' 
                                : 'hover:bg-white/5 border border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeGroup?._id === group._id ? 'bg-brand-primary/30 text-brand-primary' : 'bg-black/30'}`}>
                                    <Users className="w-4 h-4" />
                                </div>
                                <span className={`font-semibold ${activeGroup?._id === group._id ? 'text-white' : ''}`}>{group.name}</span>
                            </div>
                            {activeGroup?._id === group._id && <ChevronRight className="w-4 h-4 text-brand-primary" />}
                        </button>
                    ))}

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-brand-primary hover:bg-brand-primary/10 transition-all mt-6 group"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/20 group-hover:bg-brand-primary/20 group-hover:text-brand-primary transition-colors">
                            <Plus className="w-4 h-4" />
                        </div>
                        <span className="font-semibold">New Workspace</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
                {activeGroup ? (
                    <>
                        {/* Header */}
                        <div className="px-10 py-8 glass-panel border-x-0 border-t-0 flex justify-between items-center z-20">
                            <div>
                                <h2 className="text-4xl font-extrabold mb-2 tracking-tight">{activeGroup.name}</h2>
                                <p className="text-gray-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
                                    {activeGroup.description || "Active Workspace"}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3 mr-4">
                                    {activeGroup.members.slice(0, 4).map((m, i) => (
                                        <div key={i} title={m} className="w-10 h-10 rounded-full border-2 border-brand-card flex items-center justify-center font-bold text-sm shadow-md" style={{ background: COLORS[i % COLORS.length] }}>
                                            {m.charAt(0).toUpperCase()}
                                        </div>
                                    ))}
                                    {activeGroup.members.length > 4 && (
                                        <div className="w-10 h-10 rounded-full border-2 border-brand-card bg-gray-800 flex items-center justify-center font-bold text-sm shadow-md">
                                            +{activeGroup.members.length - 4}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setIsAddMemberModalOpen(true)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10" title="Add Member">
                                    <UserPlus className="w-5 h-5 text-gray-300" />
                                </button>
                                <button onClick={() => setIsSettlementOpen(true)} className="px-6 py-2.5 bg-gradient-to-r from-brand-primary to-brand-neon hover:opacity-90 rounded-xl font-bold shadow-neon transition-all">
                                    Settle Up
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                            
                            {/* Top Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl glass-panel relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp className="w-24 h-24 text-brand-primary" /></div>
                                    <h3 className="text-gray-400 font-medium mb-1 relative z-10">Total Expenses</h3>
                                    <p className="text-4xl font-extrabold text-white relative z-10">{activeGroup.currency}{totalExpenses.toFixed(2)}</p>
                                </motion.div>
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-3xl glass-panel relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign className="w-24 h-24 text-brand-neon" /></div>
                                    <h3 className="text-gray-400 font-medium mb-1 relative z-10">Your Net Balance</h3>
                                    <p className={`text-4xl font-extrabold relative z-10 ${userNetBalance > 0 ? 'text-green-400' : userNetBalance < 0 ? 'text-red-400' : 'text-white'}`}>
                                        {userNetBalance > 0 ? '+' : ''}{activeGroup.currency}{userNetBalance.toFixed(2)}
                                    </p>
                                </motion.div>
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-3xl glass-panel flex flex-col justify-center items-center cursor-pointer hover:bg-brand-card/80 transition-colors" onClick={() => setIsSettlementOpen(true)}>
                                    <Activity className="w-10 h-10 text-brand-secondary mb-3" />
                                    <p className="font-bold text-lg">View Settlements</p>
                                    <p className="text-sm text-gray-400">{balances.length} active debts</p>
                                </motion.div>
                            </div>

                            {/* Main Split View */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Col: Expenses List */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-2xl font-bold">Recent Activity</h3>
                                        <div className="flex gap-3">
                                            <div className="relative">
                                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 glass-input rounded-xl text-sm w-48" />
                                            </div>
                                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-4 py-2 glass-input rounded-xl text-sm appearance-none cursor-pointer">
                                                <option value="All">All Categories</option>
                                                {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <button onClick={exportToPDF} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors" title="Export PDF">
                                                <Download className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {filteredExpenses.length === 0 ? (
                                        <div className="p-16 text-center border border-dashed border-gray-700/50 rounded-3xl bg-black/20">
                                            <div className="w-20 h-20 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-neon">
                                                <DollarSign className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2">No expenses yet</h3>
                                            <p className="text-gray-400 mb-8 max-w-md mx-auto">Click the button below to add your first expense and start splitting with friends.</p>
                                            <button onClick={() => {
                                                setExpenseForm({ id: null, description: '', amount: '', paidBy: user.name, category: 'General', splitType: 'EQUAL', participants: activeGroup.members, splitDetails: [] });
                                                setIsExpenseModalOpen(true);
                                            }} className="px-8 py-3 bg-brand-primary hover:bg-brand-primary/90 rounded-xl font-bold transition-all shadow-lg">
                                                Add First Expense
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {filteredExpenses.map((expense, idx) => (
                                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} key={expense._id} className="p-5 glass-panel rounded-2xl flex items-center justify-between group hover:border-brand-primary/50 transition-colors">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 rounded-2xl bg-black/40 flex items-center justify-center text-2xl shadow-inner border border-white/5">
                                                            {CATEGORY_ICONS[expense.category] || '📝'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-lg text-gray-100">{expense.description}</h4>
                                                            <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                                                                <span className="font-medium text-brand-secondary">{expense.payer}</span> paid
                                                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                                                <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
                                                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                                                <span className="px-2 py-0.5 bg-white/5 rounded-md text-xs">{expense.splitType}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <span className="text-2xl font-extrabold text-white block">{activeGroup.currency}{expense.amount.toFixed(2)}</span>
                                                            <span className="text-xs text-gray-500">Total</span>
                                                        </div>
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => {
                                                                setExpenseForm({ id: expense._id, description: expense.description, amount: expense.amount, paidBy: expense.payer, category: expense.category, splitType: expense.splitType, participants: expense.participants, splitDetails: expense.splitDetails || [] });
                                                                setIsExpenseModalOpen(true);
                                                            }} className="p-2 hover:bg-brand-secondary/20 hover:text-brand-secondary rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteExpense(expense._id)} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right Col: Charts & Quick Add */}
                                <div className="space-y-6">
                                    <button onClick={() => {
                                        setExpenseForm({ id: null, description: '', amount: '', paidBy: user.name, category: 'General', splitType: 'EQUAL', participants: activeGroup.members, splitDetails: [] });
                                        setIsExpenseModalOpen(true);
                                    }} className="w-full py-4 bg-gradient-to-r from-brand-primary/20 to-brand-neon/20 hover:from-brand-primary/30 hover:to-brand-neon/30 border border-brand-primary/50 rounded-2xl flex items-center justify-center gap-2 text-brand-neon font-bold text-lg transition-all shadow-[0_0_20px_rgba(217,70,239,0.1)]">
                                        <Plus className="w-5 h-5" /> Quick Add Expense
                                    </button>

                                    {expenses.length > 0 && (
                                        <div className="glass-panel p-6 rounded-3xl">
                                            <h3 className="font-bold mb-6 flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-brand-secondary"/> Spending Distribution</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: '#1a1b23', border: '1px solid #2a2b36', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-3 mt-4">
                                                {pieData.map((entry, index) => (
                                                    <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                                        {entry.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 z-10">
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-32 h-32 bg-brand-card/50 rounded-full flex items-center justify-center mb-6 shadow-glass border border-white/5">
                            <Users className="w-16 h-16 text-brand-primary opacity-50" />
                        </motion.div>
                        <h2 className="text-3xl font-extrabold mb-4">Welcome to Payment Splitter</h2>
                        <p className="text-gray-400 max-w-md mx-auto mb-8 text-lg">Create a workspace on the left to start organizing expenses and settling up with friends seamlessly.</p>
                        <button onClick={() => setIsCreateModalOpen(true)} className="px-8 py-3 bg-brand-primary hover:bg-brand-primary/90 rounded-xl font-bold transition-all shadow-lg">
                            Create First Workspace
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-card border border-brand-border p-8 rounded-[2rem] w-full max-w-md shadow-2xl">
                            <h3 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
                                <Plus className="text-brand-neon" /> New Workspace
                            </h3>
                            <form onSubmit={handleCreateGroup} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Workspace Name</label>
                                    <input type="text" required value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} className="w-full px-4 py-3.5 glass-input rounded-xl" placeholder="e.g. Goa Trip 2024" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                                    <textarea value={groupForm.description} onChange={e => setGroupForm({...groupForm, description: e.target.value})} className="w-full px-4 py-3.5 glass-input rounded-xl resize-none h-24" placeholder="Brief details..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Currency</label>
                                    <select value={groupForm.currency} onChange={e => setGroupForm({...groupForm, currency: e.target.value})} className="w-full px-4 py-3.5 glass-input rounded-xl">
                                        <option value="$">US Dollar ($)</option>
                                        <option value="₹">Indian Rupee (₹)</option>
                                        <option value="€">Euro (€)</option>
                                        <option value="£">British Pound (£)</option>
                                    </select>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3.5 bg-black/40 hover:bg-black/60 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 py-3.5 bg-brand-primary hover:bg-brand-primary/90 rounded-xl font-bold shadow-[0_0_15px_rgba(109,40,217,0.4)]">Create</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isAddMemberModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-card border border-brand-border p-8 rounded-[2rem] w-full max-w-sm shadow-2xl">
                            <h3 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
                                <UserPlus className="text-brand-secondary" /> Add Member
                            </h3>
                            <form onSubmit={handleAddMember} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                                    <input type="text" required value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="w-full px-4 py-3.5 glass-input rounded-xl" placeholder="John Doe" />
                                </div>
                                <div className="flex gap-4 pt-2">
                                    <button type="button" onClick={() => setIsAddMemberModalOpen(false)} className="flex-1 py-3.5 bg-black/40 hover:bg-black/60 rounded-xl font-bold">Cancel</button>
                                    <button type="submit" className="flex-1 py-3.5 bg-brand-secondary hover:bg-blue-600 rounded-xl font-bold shadow-[0_0_15px_rgba(59,130,246,0.4)]">Add</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isExpenseModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-card border border-brand-border p-8 rounded-[2rem] w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <h3 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
                                <DollarSign className="text-brand-neon" /> {expenseForm.id ? 'Edit Expense' : 'Log Expense'}
                            </h3>
                            <form onSubmit={handleSaveExpense} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                                        <input type="text" required value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full px-4 py-3 glass-input rounded-xl" placeholder="Dinner at Mario's" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Amount ({activeGroup?.currency})</label>
                                        <input type="number" required min="0.01" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full px-4 py-3 glass-input rounded-xl text-brand-neon font-bold text-lg" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                                        <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full px-4 py-3 glass-input rounded-xl">
                                            {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Paid By</label>
                                        <select value={expenseForm.paidBy} onChange={e => setExpenseForm({...expenseForm, paidBy: e.target.value})} className="w-full px-4 py-3 glass-input rounded-xl">
                                            {activeGroup?.members.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="p-5 bg-black/30 rounded-2xl border border-white/5">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="block text-sm font-medium text-gray-400">Split Type</label>
                                        <div className="flex bg-black/40 rounded-lg p-1">
                                            {['EQUAL', 'EXACT', 'PERCENTAGE'].map(type => (
                                                <button key={type} type="button" onClick={() => setExpenseForm({...expenseForm, splitType: type})} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${expenseForm.splitType === type ? 'bg-brand-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {activeGroup?.members.map(m => {
                                            const isSelected = expenseForm.participants.includes(m);
                                            const detail = expenseForm.splitDetails.find(d => d.user === m) || {};
                                            return (
                                                <div key={m} className={`flex items-center gap-4 p-3 rounded-xl transition-colors border ${isSelected ? 'bg-white/5 border-white/10' : 'border-transparent'}`}>
                                                    {expenseForm.splitType === 'EQUAL' && (
                                                        <input type="checkbox" checked={isSelected} onChange={(e) => {
                                                            const newParts = e.target.checked ? [...expenseForm.participants, m] : expenseForm.participants.filter(p => p !== m);
                                                            setExpenseForm({...expenseForm, participants: newParts});
                                                        }} className="w-5 h-5 accent-brand-primary bg-black/40 border-brand-border rounded" />
                                                    )}
                                                    <span className="flex-1 font-medium">{m}</span>
                                                    
                                                    {expenseForm.splitType === 'EQUAL' && isSelected && expenseForm.amount && (
                                                        <span className="text-gray-400 font-mono">
                                                            {activeGroup.currency}{(Number(expenseForm.amount) / Math.max(1, expenseForm.participants.length)).toFixed(2)}
                                                        </span>
                                                    )}

                                                    {expenseForm.splitType === 'EXACT' && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500">{activeGroup.currency}</span>
                                                            <input type="number" step="0.01" value={detail.amount || ''} onChange={(e) => {
                                                                const val = Number(e.target.value);
                                                                let newDetails = [...expenseForm.splitDetails];
                                                                const idx = newDetails.findIndex(d => d.user === m);
                                                                if (idx > -1) newDetails[idx] = { user: m, amount: val };
                                                                else newDetails.push({ user: m, amount: val });
                                                                
                                                                // Also update participants array for backend logic
                                                                const newParts = newDetails.filter(d => d.amount > 0).map(d => d.user);
                                                                setExpenseForm({...expenseForm, splitDetails: newDetails, participants: newParts});
                                                            }} className="w-24 px-3 py-1.5 glass-input rounded-lg text-right font-mono" placeholder="0.00" />
                                                        </div>
                                                    )}

                                                    {expenseForm.splitType === 'PERCENTAGE' && (
                                                        <div className="flex items-center gap-2">
                                                            <input type="number" step="1" value={detail.percentage || ''} onChange={(e) => {
                                                                const pct = Number(e.target.value);
                                                                const amt = (Number(expenseForm.amount) * pct) / 100;
                                                                let newDetails = [...expenseForm.splitDetails];
                                                                const idx = newDetails.findIndex(d => d.user === m);
                                                                if (idx > -1) newDetails[idx] = { user: m, amount: amt, percentage: pct };
                                                                else newDetails.push({ user: m, amount: amt, percentage: pct });
                                                                
                                                                const newParts = newDetails.filter(d => d.percentage > 0).map(d => d.user);
                                                                setExpenseForm({...expenseForm, splitDetails: newDetails, participants: newParts});
                                                            }} className="w-20 px-3 py-1.5 glass-input rounded-lg text-right font-mono" placeholder="0" />
                                                            <span className="text-gray-500">%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Preview summary */}
                                    {expenseForm.splitType !== 'EQUAL' && (
                                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
                                            <span className="text-gray-400">Total Allocated:</span>
                                            <span className={`font-mono font-bold ${
                                                expenseForm.splitType === 'EXACT' 
                                                ? (expenseForm.splitDetails.reduce((a,c)=>a+(c.amount||0),0) === Number(expenseForm.amount) ? 'text-green-400' : 'text-red-400')
                                                : (expenseForm.splitDetails.reduce((a,c)=>a+(c.percentage||0),0) === 100 ? 'text-green-400' : 'text-red-400')
                                            }`}>
                                                {expenseForm.splitType === 'EXACT' 
                                                ? `${activeGroup.currency}${expenseForm.splitDetails.reduce((a,c)=>a+(c.amount||0),0).toFixed(2)} / ${activeGroup.currency}${Number(expenseForm.amount||0).toFixed(2)}`
                                                : `${expenseForm.splitDetails.reduce((a,c)=>a+(c.percentage||0),0)}% / 100%`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-4 bg-black/40 hover:bg-black/60 rounded-xl font-bold transition-colors">Cancel</button>
                                    <button type="submit" className="flex-1 py-4 bg-brand-neon hover:bg-fuchsia-500 rounded-xl font-bold shadow-[0_0_15px_rgba(217,70,239,0.4)]">Save Expense</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isSettlementOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-card border border-brand-border p-8 rounded-[2rem] w-full max-w-lg shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-extrabold flex items-center gap-2">
                                    <Activity className="text-green-400" /> Settle Up
                                </h3>
                                <button onClick={() => setIsSettlementOpen(false)} className="text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
                            </div>
                            
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {balances.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <h4 className="text-xl font-bold text-white mb-1">All settled up!</h4>
                                        <p className="text-gray-400 text-sm">No one owes anything in this workspace.</p>
                                    </div>
                                ) : (
                                    balances.map((settle, i) => (
                                        <div key={i} className="bg-black/30 border border-white/5 p-5 rounded-2xl flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">{settle.from.charAt(0).toUpperCase()}</div>
                                                    <span className="font-bold text-gray-200">{settle.from}</span>
                                                </div>
                                                <div className="flex-1 flex flex-col items-center px-4">
                                                    <span className="text-xs font-mono text-gray-400 mb-1">owes</span>
                                                    <div className="w-full h-[2px] bg-gradient-to-r from-red-500/50 via-gray-600 to-green-500/50 relative">
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-green-500/50"></div>
                                                    </div>
                                                    <span className="font-extrabold text-lg mt-1 text-white bg-black/50 px-3 py-0.5 rounded-full mt-[-10px] relative z-10 border border-white/10 shadow-lg">
                                                        {activeGroup?.currency}{settle.amount.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-200">{settle.to}</span>
                                                    <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">{settle.to.charAt(0).toUpperCase()}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleSettlePayment(settle.from, settle.to, settle.amount)} className="w-full py-2 bg-white/5 hover:bg-green-500/20 hover:text-green-400 border border-white/10 rounded-xl text-sm font-bold transition-colors">
                                                Record Payment
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Dashboard;
