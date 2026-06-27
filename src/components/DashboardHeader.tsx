import React from "react";
import { signOut, auth, db, collection, addDoc } from "../firebase";
import { Commitment, Notification } from "../types";
import { LogOut, ClipboardList, Calendar } from "lucide-react";
import NotificationPopover from "./NotificationPopover";
import { getCachedToken, connectGoogleCalendar, createGoogleEvent } from "../services/googleCalendar";

interface DashboardHeaderProps {
  commitments: Commitment[];
  onTriggerAudit: () => void;
  isAuditing: boolean;
  onSignOut: () => void;
  userName?: string;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAll: () => void;
}

export default function DashboardHeader({ 
  commitments, 
  onTriggerAudit, 
  isAuditing, 
  onSignOut,
  userName = "Guest",
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
}: DashboardHeaderProps) {
  
  const activeCommitments = commitments.filter(c => c.status === "Active");

  // Calculate dynamic health score
  const calculateHealthScore = () => {
    if (activeCommitments.length === 0) return 100;
    
    const sumRisk = activeCommitments.reduce((acc, c) => acc + c.riskScore, 0);
    const avgRisk = sumRisk / activeCommitments.length;
    
    // Workload penalty if they have > 4 active commitments
    const workloadPenalty = activeCommitments.length > 4 ? (activeCommitments.length - 4) * 5 : 0;
    
    // Critical risk penalty
    const criticalCount = activeCommitments.filter(c => c.riskLevel === "Critical").length;
    const criticalPenalty = criticalCount * 12;

    const health = Math.max(0, Math.min(100, Math.round(100 - avgRisk - workloadPenalty - criticalPenalty)));
    return health;
  };

  const healthScore = calculateHealthScore();

  const getHealthMeta = (score: number) => {
    if (score >= 80) return { color: "text-emerald-800", bg: "bg-emerald-100/60 border-emerald-200/50", label: "Optimal Velocity" };
    if (score >= 60) return { color: "text-amber-850", bg: "bg-amber-100/60 border-amber-200/50", label: "Stable / Alert" };
    if (score >= 40) return { color: "text-orange-800", bg: "bg-orange-100/60 border-orange-200/50", label: "High Strain" };
    return { color: "text-red-800", bg: "bg-red-100/60 border-red-200/50", label: "Critical Overload" };
  };

  const meta = getHealthMeta(healthScore);

  const [exportingGoogle, setExportingGoogle] = React.useState(false);

  const handleExportAllToGoogleCalendar = async () => {
    if (activeCommitments.length === 0) {
      alert("No active obligations found to export.");
      return;
    }

    try {
      setExportingGoogle(true);

      let token = getCachedToken();
      if (!token) {
        const confirmedConnect = window.confirm("Connect to your Google Calendar to export active obligations?");
        if (!confirmedConnect) {
          setExportingGoogle(false);
          return;
        }
        token = await connectGoogleCalendar();
      }

      const confirmed = window.confirm(
        `Export all ${activeCommitments.length} active obligations to your primary Google Calendar?`
      );
      if (!confirmed) {
        setExportingGoogle(false);
        return;
      }

      let successCount = 0;
      for (const commitment of activeCommitments) {
        let startISO = "";
        let endISO = "";
        if (commitment.deadline.includes("T")) {
          const d = new Date(commitment.deadline);
          startISO = d.toISOString();
          endISO = new Date(d.getTime() + 60 * 60 * 1000).toISOString();
        } else {
          startISO = `${commitment.deadline}T09:00:00`;
          endISO = `${commitment.deadline}T10:00:00`;
        }

        try {
          await createGoogleEvent({
            summary: commitment.title,
            description: commitment.explanation || "Foresight Obligation Ledger Entry",
            startDateTime: startISO,
            endDateTime: endISO,
          });
          successCount++;
        } catch (eventErr) {
          console.error(`Failed to export event: ${commitment.title}`, eventErr);
        }
      }

      alert(`Successfully scheduled ${successCount} out of ${activeCommitments.length} active obligations on Google Calendar!`);

      if (auth.currentUser && successCount > 0) {
        await addDoc(collection(db, "notifications"), {
          userId: auth.currentUser.uid,
          title: "Google Calendar Batch Export",
          message: `Successfully synchronized ${successCount} active obligations to your primary Google Calendar.`,
          type: "success",
          read: false,
          createdAt: new Date().toISOString()
        });
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to export active obligations to Google Calendar.");
    } finally {
      setExportingGoogle(false);
    }
  };

  const handleLogoutClick = async () => {
    await signOut(auth);
    onSignOut();
  };

  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-[#1A1A1A]/10 font-sans">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60 mb-2">
          AI-Powered Commitment Intelligence Platform
        </span>
        <h1 className="text-4xl md:text-5xl font-serif italic font-light tracking-tight text-[#1A1A1A] flex items-baseline gap-2">
          Foresight<span className="text-indigo-600">.</span>
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-6 md:gap-10 mt-6 md:mt-0">
        
        {/* Dynamic score */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider opacity-50 block font-semibold">Commitment Health</span>
            <span className={`text-[10px] font-mono font-bold ${meta.color} bg-white/40 px-2 py-0.5 border border-[#1A1A1A]/5 rounded`}>
              {meta.label}
            </span>
          </div>
          <div className="flex items-baseline">
            <span className="text-5xl font-serif italic font-light tracking-tight">{healthScore}</span>
            <span className="text-sm font-serif italic opacity-60">%</span>
          </div>
        </div>

        {/* Counts */}
        <div className="flex gap-4 text-xs border-l border-[#1A1A1A]/10 pl-6 py-1">
          <div>
            <span className="text-[9px] uppercase tracking-wider opacity-50 block">Active</span>
            <span className="font-semibold text-[#1A1A1A]">{activeCommitments.length}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider opacity-50 block">At Risk</span>
            <span className="font-semibold text-rose-600">
              {activeCommitments.filter(c => c.riskLevel === "Critical" || c.riskLevel === "High").length}
            </span>
          </div>
        </div>

        {/* User context */}
        <div className="flex flex-col text-right border-l border-[#1A1A1A]/10 pl-6 py-1">
          <span className="text-[10px] uppercase tracking-wider opacity-50">Current User</span>
          <span className="text-sm font-medium italic text-[#1A1A1A]">{userName}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-l border-[#1A1A1A]/10 pl-6 py-1">
          <NotificationPopover
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onDeleteNotification={onDeleteNotification}
            onClearAll={onClearAll}
          />
          <button
            onClick={handleExportAllToGoogleCalendar}
            disabled={exportingGoogle}
            className="px-4 py-2 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Export all active obligations to Google Calendar"
          >
            <Calendar className="w-3.5 h-3.5" />
            {exportingGoogle ? "Exporting..." : "Export All to GCal"}
          </button>
          <button
            onClick={onTriggerAudit}
            disabled={isAuditing}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-black text-[#F4F1EE] font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            {isAuditing ? "Auditing..." : "Run Audit"}
          </button>
          <button
            onClick={handleLogoutClick}
            className="p-2 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
