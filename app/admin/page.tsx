"use client";
import React, { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  Shield, Zap, Crown, Clock, Users, Activity,
  MapPin, Trash2, Edit3, Check, X, Monitor, Apple,
} from "lucide-react";

export default function AdminPage() {
  const [users, setUsers]               = useState<any[]>([]);
  const [downloads, setDownloads]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [newCreditValue, setNewCreditValue] = useState<number>(0);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const ADMIN_EMAIL = "krishnapk288@gmail.com";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        fetchAll();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      const [usersSnap, dlSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "app_downloads")),
      ]);
      const userList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      userList.sort((a: any, b: any) => (b.lastActive?.seconds || 0) - (a.lastActive?.seconds || 0));
      setUsers(userList);
      setDownloads(dlSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  function fetchUsers() { fetchAll(); }

  async function updatePlan(userId: string, plan: string, credits: number) {
    await updateDoc(doc(db, "users", userId), { plan, credits });
    fetchAll();
  }

  async function handleManualCredits(userId: string) {
    await updateDoc(doc(db, "users", userId), { credits: newCreditValue });
    setEditingCredits(null);
    fetchAll();
  }

  async function removeUser(userId: string, email: string) {
    if (confirm("PERMANENTLY DELETE USER: " + email + "?\nThis cannot be undone.")) {
      await deleteDoc(doc(db, "users", userId));
      fetchAll();
    }
  }

  function formatTime(minutes: number) {
    if (!minutes) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? h + "h " + m + "m" : m + "m";
  }

  function fmtTs(ts: any): string {
    if (!ts) return "\u2014";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return "\u2014"; }
  }

  function fmtIso(iso: string): string {
    if (!iso) return "\u2014";
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return "\u2014"; }
  }

  if (loading) return (
    <div className="p-20 text-white text-center animate-pulse">Accessing Secure Database...</div>
  );
  if (!isAdmin) return (
    <div className="p-20 text-red-500 font-bold text-center">403: Forbidden - Admin Only</div>
  );

  const liveCount = users.filter(u => (Date.now()/1000 - (u.lastActive?.seconds || 0)) < 300).length;
  const proCount  = users.filter(u => u.plan === "pro").length;
  const totalMins = users.reduce((acc, u) => acc + (u.totalMinutesSpent || 0), 0);
  const winDls    = downloads.filter(d => d.os === "win").length;
  const macDls    = downloads.filter(d => d.os === "mac").length;

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 font-sans">
      <div className="max-w-[1600px] mx-auto">

        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
              <Shield className="text-blue-500" size={36} />
              COOPILOTX <span className="text-blue-600">COMMAND</span>
            </h1>
            <p className="text-gray-500 font-medium">
              Manage every user, plan, credit, location and session across the platform
            </p>
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 transition-all text-sm font-bold"
          >
            Refresh Data
          </button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <StatCard icon={<Users className="text-blue-400" />}    label="Total Users"   value={users.length} />
          <StatCard icon={<Activity className="text-green-400" />} label="Live Now"      value={liveCount}  color="text-green-400" />
          <StatCard icon={<Crown className="text-amber-400" />}   label="Pro Members"   value={proCount} />
          <StatCard icon={<Zap className="text-purple-400" />}    label="Total Usage"   value={formatTime(totalMins)} />
          <StatCard icon={<Monitor className="text-cyan-400" />}  label="Win Downloads" value={winDls} color="text-cyan-400" />
          <StatCard icon={<Apple className="text-gray-300" />}    label="Mac Downloads" value={macDls} color="text-gray-300" />
        </div>

        <div className="bg-[#0a0a0f] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-gray-900/40 text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="p-4">User Identity</th>
                <th className="p-4 text-center">Location / IP</th>
                <th className="p-4 text-center">Session Activity</th>
                <th className="p-4 text-center">Credits</th>
                <th className="p-4 text-center">Plan</th>
                <th className="p-4 text-center">App Downloads</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  expanded={expandedUser === user.id}
                  onToggle={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  editingCredits={editingCredits}
                  setEditingCredits={setEditingCredits}
                  newCreditValue={newCreditValue}
                  setNewCreditValue={setNewCreditValue}
                  onUpdatePlan={updatePlan}
                  onSaveCredits={handleManualCredits}
                  onRemove={removeUser}
                  formatTime={formatTime}
                  fmtTs={fmtTs}
                  fmtIso={fmtIso}
                />
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-20 text-center text-gray-600 font-bold uppercase tracking-widest">
              No Citizens Found in Database
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user, expanded, onToggle,
  editingCredits, setEditingCredits, newCreditValue, setNewCreditValue,
  onUpdatePlan, onSaveCredits, onRemove,
  formatTime, fmtTs, fmtIso,
}: any) {
  const isOnline     = (Date.now()/1000 - (user.lastActive?.seconds || 0)) < 300;
  const userDls      = Array.isArray(user.appDownloads) ? user.appDownloads : [];
  const winDl        = userDls.find((d: any) => d.os === "win");
  const macDl        = userDls.find((d: any) => d.os === "mac");
  const history      = Array.isArray(user.loginHistory) ? user.loginHistory : [];
  const recentLogins = [...history].reverse().slice(0, 5);

  return (
    <React.Fragment>
      <tr
        className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="p-4">
          <div className="font-bold text-sm text-gray-200">{user.email}</div>
          <div className="text-[10px] text-gray-600 font-mono mt-0.5">{user.id}</div>
          {(user.loginCount || 0) > 0 && (
            <div className="text-[9px] text-indigo-500 mt-0.5">{user.loginCount} sessions</div>
          )}
        </td>

        <td className="p-4 text-center">
          {user.location ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                <MapPin size={10} className="text-red-500" />
                {user.location.city}{user.location.region ? ", " + user.location.region : ""}
              </span>
              <span className="text-[9px] text-gray-500 font-black uppercase">{user.location.country}</span>
              {user.location.ip && (
                <span className="text-[8px] text-gray-700 font-mono">{user.location.ip}</span>
              )}
            </div>
          ) : (
            <span className="text-gray-800 text-[10px] italic">No GeoData</span>
          )}
        </td>

        <td className="p-4 text-center">
          <div className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter " + (
            isOnline
              ? "bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse"
              : "bg-gray-800/30 text-gray-600"
          )}>
            {isOnline ? "\u25cf Live" : "Offline"}
          </div>
          <div className="text-[9px] text-gray-600 mt-1">
            Login: {fmtTs(user.lastLoginAt || user.lastEntry || user.lastActive)}
          </div>
          {user.lastExit && !isOnline && (
            <div className="text-[9px] text-gray-700">Left: {fmtTs(user.lastExit)}</div>
          )}
        </td>

        <td className="p-4 text-center">
          {editingCredits === user.id ? (
            <div className="flex items-center justify-center gap-1">
              <input
                type="number"
                className="w-16 bg-gray-800 border border-blue-500 rounded px-1 text-xs text-center"
                defaultValue={user.credits || 0}
                onChange={(e) => setNewCreditValue(Number(e.target.value))}
                onClick={(e: any) => e.stopPropagation()}
              />
              <button onClick={(e: any) => { e.stopPropagation(); onSaveCredits(user.id); }} className="text-green-500">
                <Check size={14} />
              </button>
              <button onClick={(e: any) => { e.stopPropagation(); setEditingCredits(null); }} className="text-red-500">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 group/credits">
              <span className="font-mono text-sm text-blue-400 font-bold">{user.credits ?? 0}</span>
              <button
                onClick={(e: any) => {
                  e.stopPropagation();
                  setEditingCredits(user.id);
                  setNewCreditValue(user.credits || 0);
                }}
                className="opacity-0 group-hover/credits:opacity-100 transition-opacity"
              >
                <Edit3 size={12} className="text-gray-500 hover:text-white" />
              </button>
            </div>
          )}
        </td>

        <td className="p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className={"px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-inner " + (
              user.plan === "pro" ? "bg-amber-500 text-black" :
              user.plan === "basic" ? "bg-blue-600 text-white" :
              "bg-gray-800 text-gray-400"
            )}>
              {user.plan || "Free"}
            </span>
            <div className="flex gap-1">
              <button onClick={(e: any) => { e.stopPropagation(); onUpdatePlan(user.id, "free", 100); }} title="Free" className="w-5 h-5 rounded bg-gray-900 border border-gray-800 text-[8px] flex items-center justify-center hover:border-blue-500">F</button>
              <button onClick={(e: any) => { e.stopPropagation(); onUpdatePlan(user.id, "basic", 1000); }} title="Basic" className="w-5 h-5 rounded bg-gray-900 border border-gray-800 text-[8px] flex items-center justify-center hover:border-blue-500">B</button>
              <button onClick={(e: any) => { e.stopPropagation(); onUpdatePlan(user.id, "pro", 99999); }} title="Pro" className="w-5 h-5 rounded bg-gray-900 border border-gray-800 text-[8px] flex items-center justify-center hover:border-amber-500">P</button>
            </div>
          </div>
        </td>

        <td className="p-4 text-center">
          {(winDl || macDl) ? (
            <div className="flex flex-col items-center gap-1">
              {winDl && <div className="flex items-center gap-1 text-[9px] text-cyan-400"><Monitor size={9} /> Win — {fmtIso(winDl.at)}</div>}
              {macDl && <div className="flex items-center gap-1 text-[9px] text-gray-300"><Apple size={9} /> Mac — {fmtIso(macDl.at)}</div>}
            </div>
          ) : (
            <span className="text-[9px] text-gray-800 italic">None</span>
          )}
        </td>

        <td className="p-4 text-right">
          <div className="flex justify-end items-center gap-3">
            <div className="flex flex-col items-end">
              <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">Time Logged</div>
              <div className="text-xs font-mono text-gray-400">{formatTime(user.totalMinutesSpent)}</div>
            </div>
            <button
              onClick={(e: any) => { e.stopPropagation(); onRemove(user.id, user.email); }}
              className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>

      {expanded && recentLogins.length > 0 && (
        <tr className="bg-gray-950">
          <td colSpan={7} className="px-8 py-4">
            <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={10} /> Login History (last {recentLogins.length})
            </div>
            <div className="flex flex-wrap gap-3">
              {recentLogins.map((entry: any, i: number) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-[10px]">
                  <div className="text-gray-300 font-bold">{fmtIso(entry.at)}</div>
                  {entry.city && (
                    <div className="text-gray-600 flex items-center gap-1 mt-0.5">
                      <MapPin size={8} className="text-red-600" />
                      {entry.city}{entry.country ? ", " + entry.country : ""}
                    </div>
                  )}
                  {entry.ip && <div className="text-gray-800 font-mono mt-0.5">{entry.ip}</div>}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

function StatCard({ icon, label, value, color = "text-white" }: any) {
  return (
    <div className="bg-[#0a0a0f] p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <div className="mb-3">{icon}</div>
      <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{label}</div>
      <div className={"text-3xl font-black mt-1 " + color}>{value}</div>
    </div>
  );
}
