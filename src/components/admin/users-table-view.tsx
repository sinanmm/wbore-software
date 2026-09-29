"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/utils";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export function UsersTableView({
  initialUsers,
  currentUserRole,
}: {
  initialUsers: UserItem[];
  currentUserRole?: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("ADMIN");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
            Adjudicator & Admin Users ({users.length})
          </h2>
          <p className="text-xs text-slate-400">
            Manage authenticated adjudicators, verification officers, and system administrators.
          </p>
        </div>

        {isSuperAdmin && (
          <Button
            variant="gold"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="font-bold shadow-gold"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Staff User
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Users className="h-8 w-8 mx-auto text-slate-600" />
            <p>No admin users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Assigned Role</th>
                  <th className="px-5 py-4">Created Date</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => {
                  let roleColor = "bg-blue-500/10 border-blue-500/30 text-blue-300";
                  if (u.role === "SUPER_ADMIN") {
                    roleColor = "bg-amber-500/10 border-amber-500/30 text-amber-300";
                  } else if (u.role === "VERIFICATION_OFFICER") {
                    roleColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
                  }

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-white flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs">
                          {u.name.charAt(0)}
                        </div>
                        {u.name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-300">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-semibold ${roleColor}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Official / Adjudicator"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dr. Isabella Martinez"
            required
          />

          <Input
            label="Official Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. adjudicator@wbre.org"
            required
          />

          <Input
            label="Initial Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Role & Access Level</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ADMIN">ADMIN (Review, Approve/Reject, Issue Certs)</option>
              <option value="VERIFICATION_OFFICER">
                VERIFICATION_OFFICER (Verify Certificates, View Approved Records)
              </option>
              <option value="SUPER_ADMIN">
                SUPER_ADMIN (Full Access, User Management, System Settings)
              </option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              isLoading={isLoading}
              className="font-bold"
            >
              Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
