"use client";
import { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Shield, Zap, Crown, Clock, Users, Activity, MapPin, Trash2, Edit3, Check, X, UserPlus } from "lucide-react";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [newCreditValue, setNewCreditValue] = useState<number>(0);

  const ADMIN_EMAIL = "krishnapk288@gmail.com"; 

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        fetchUsers();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      userList.sort((a: any, b: any) => (b.lastActive?.seconds || 0) - (a.lastActive?.seconds || 0));
      setUsers(userList);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  // --- ACTIONS ---

  async function updatePlan(userId: string, plan: string, credits: number) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { plan, credits });
    fetchUsers();
  }

  async function handleManualCredits(userId: string) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { credits: newCreditValue });
    setEditingCredits(null);
    fetchUsers();
  }

  async function removeUser(userId: string, email: string) {
    if (confirm(`PERMANENTLY DELETE USER: ${email}?\nThis cannot be undone.`)) {
      await deleteDoc(doc(db, "users", userId));
      fetchUsers();
    }
  }

  // --- HELPERS ---

  function formatTime(minutes: number) {
    if (!minutes) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading) return <div className="p-20 text-white text-center animate-pulse">Accessing Secure Database...</div>;
  if (!isAdmin) return <div className="p-20 text-red-500 font-bold text-center">403: Forbidden - Admin Only</div>;

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        <header className="flex justify-between items-end mb-8">
            <div>
                <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                    <Shield className="text-blue-500" size={36} /> COOPILOTX <span className="text-blue-600">COMMAND</span>
                </h1>
                <p className="text-gray-500 font-medium">Manage every user, plan, and credit across the platform</p>
            </div>
            <div className="flex gap-4">
                <button onClick={fetchUsers} className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 transition-all text-sm font-bold">Refresh Data</button>
            </div>
        </header>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users className="text-blue-400" />} label="Total Users" value={users.length} />
          <StatCard icon={<Activity className="text-green-400" />} label="Live Now" value={users.filter(u => (Date.now()/1000 - (u.lastActive?.seconds || 0)) < 300).length} color="text-green-400" />
          <StatCard icon={<Crown className="text-amber-400" />} label="Pro Members" value={users.filter(u => u.plan === 'pro').length} />
          <StatCard icon={<Zap className="text-purple-400" />} label="Total Usage" value={formatTime(users.reduce((acc, u) => acc + (u.totalMinutesSpent || 0), 0))} />
        </div>

        {/* MASTER USER TABLE */}
        <div className="bg-[#0a0a0f] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-gray-900/40 text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="p-5">User Identity</th>
                <th className="p-5 text-center">Location</th>
                <th className="p-5 text-center">Active Status</th>
                <th className="p-5 text-center">Credits</th>
                <th className="p-5 text-center">Plan Access</th>
                <th className="p-5 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {users.map((user) => {
                const isOnline = (Date.now()/1000 - (user.lastActive?.seconds || 0)) < 300;
                return (
                  <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="p-5">
                      <div className="font-bold text-sm text-gray-200">{user.email}</div>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">{user.id}</div>
                    </td>
                    
                    <td className="p-5">
                       {user.location ? (
                         <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                                <MapPin size={10} className="text-red-500" /> {user.location.city}
                            </span>
                            <span className="text-[9px] text-gray-600 font-black uppercase">{user.location.country}</span>
                         </div>
                       ) : <span className="block text-center text-gray-800 text-[10px] italic">No GeoData</span>}
                    </td>

                    <td className="p-5 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                            isOnline ? "bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse" : "bg-gray-800/30 text-gray-600"
                        }`}>
                            {isOnline ? "● Live" : "Offline"}
                        </div>
                        <div className="text-[9px] text-gray-700 mt-1">{isOnline ? "Active Now" : `Last seen: ${new Date(user.lastActive?.seconds * 1000).toLocaleDateString()}`}</div>
                    </td>

                    <td className="p-5 text-center">
                        {editingCredits === user.id ? (
                            <div className="flex items-center justify-center gap-1">
                                <input 
                                    type="number" 
                                    className="w-16 bg-gray-800 border border-blue-500 rounded px-1 text-xs text-center"
                                    defaultValue={user.credits || 0}
                                    onChange={(e) => setNewCreditValue(Number(e.target.value))}
                                />
                                <button onClick={() => handleManualCredits(user.id)} className="text-green-500"><Check size={14}/></button>
                                <button onClick={() => setEditingCredits(null)} className="text-red-500"><X size={14}/></button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 group/credits">
                                <span className="font-mono text-sm text-blue-400 font-bold">{user.credits ?? 0}</span>
                                <button onClick={() => { setEditingCredits(user.id); setNewCreditValue(user.credits || 0); }} className="opacity-0 group-hover/credits:opacity-100 transition-opacity">
                                    <Edit3 size={12} className="text-gray-500 hover:text-white" />
                                </button>
                            </div>
                        )}
                    </td>

                    <td className="p-5 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-inner ${
                                user.plan === 'pro' ? 'bg-amber-500 text-black' : user.plan === 'basic' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                            }`}>
                                {user.plan || "Free"}
                            </span>
                            {/* PLAN SWITCHER SUB-MENU */}
                            <div className="flex gap-1">
                                <button onClick={() => updatePlan(user.id, "free", 100)} className="w-5 h-5 rounded bg-gray-900 border border-gray-800 text-[8px] flex items-center justify-center hover:border-blue-500" title="Switch to Free">F</button>
                                <button onClick={() => updatePlan(user.id, "basic", 1000)} className="w-5 h-5 rounded bg-gray-900 border border-gray-800 text-[8px] flex items-center justify-center hover:border-blue-500" title="Switch to Basic">B</button>
                                <button onClick={() => updatePlan(user.id, "pro", 99999)} className="w-5 h-5 rounded bg-gray-900 border border-gray-800 text-[8px] flex items-center justify-center hover:border-amber-500" title="Switch to Pro">P</button>
                            </div>
                        </div>
                    </td>

                    <td className="p-5 text-right">
                        <div className="flex justify-end items-center gap-4">
                            <div className="flex flex-col items-end">
                                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">Time Logged</div>
                                <div className="text-xs font-mono text-gray-400">{formatTime(user.totalMinutesSpent)}</div>
                            </div>
                            <button 
                                onClick={() => removeUser(user.id, user.email)}
                                className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && <div className="p-20 text-center text-gray-600 font-bold uppercase tracking-widest">No Citizens Found in Database</div>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "text-white" }: any) {
    return (
        <div className="bg-[#0a0a0f] p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">{icon}</div>
            <div className="mb-3">{icon}</div>
            <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{label}</div>
            <div className={`text-3xl font-black mt-1 ${color}`}>{value}</div>
        </div>
    );
}