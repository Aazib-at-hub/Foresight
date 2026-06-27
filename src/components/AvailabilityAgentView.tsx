import React from "react";
import { Commitment, Subtask } from "../types";
import { Clock, AlertTriangle, Check } from "lucide-react";

interface AvailabilityAgentViewProps {
  commitments: Commitment[];
  subtasks: Subtask[];
}

export default function AvailabilityAgentView({ commitments, subtasks }: AvailabilityAgentViewProps) {
  const activeCommitments = commitments.filter(c => c.status === "Active");
  
  // Calculate total workload hours from subtasks of active commitments
  const activeCommitmentIds = activeCommitments.map(c => c.id);
  const activeSubtasks = subtasks.filter(s => activeCommitmentIds.includes(s.commitmentId));
  
  const totalEstimatedHours = activeSubtasks.reduce((sum, s) => sum + s.estimatedHours, 0);
  const completedHours = activeSubtasks
    .filter(s => s.status === "Completed")
    .reduce((sum, s) => sum + s.estimatedHours, 0);
  const pendingHours = totalEstimatedHours - completedHours;

  // Assuming a weekly standard of 40 available focus hours
  const weeklyCapacityHours = 40;
  const workloadPercentage = Math.round((pendingHours / weeklyCapacityHours) * 100);

  // Detect visual scheduling conflicts (e.g., deadlines on the same date or within 48 hours)
  const getConflicts = () => {
    const conflicts: string[] = [];
    const dates: { [date: string]: Commitment[] } = {};

    activeCommitments.forEach(c => {
      if (!dates[c.deadline]) {
        dates[c.deadline] = [];
      }
      dates[c.deadline].push(c);
    });

    // Same-day conflicts
    Object.keys(dates).forEach(date => {
      if (dates[date].length > 1) {
        const titles = dates[date].map(c => `"${c.title}"`).join(" & ");
        conflicts.push(`Multiple deadlines overlap on ${date}: ${titles}`);
      }
    });

    // Tight scheduling conflicts (deadlines within 2 days)
    for (let i = 0; i < activeCommitments.length; i++) {
      for (let j = i + 1; j < activeCommitments.length; j++) {
        const c1 = activeCommitments[i];
        const c2 = activeCommitments[j];
        
        // Skip if already flagged in same-day conflict
        if (c1.deadline === c2.deadline) continue;

        const d1 = new Date(c1.deadline).getTime();
        const d2 = new Date(c2.deadline).getTime();
        const diffDays = Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);

        if (diffDays <= 2) {
          conflicts.push(`Extreme 48h Strain: "${c1.title}" (${c1.deadline}) and "${c2.title}" (${c2.deadline}) are tightly stacked.`);
        }
      }
    }

    return conflicts;
  };

  const conflictsList = getConflicts();

  // Determine workload status
  const getWorkloadStatus = (pct: number) => {
    if (pct === 0) return { label: "Optimal Capacity", color: "text-emerald-950 bg-emerald-100/60 border-emerald-200/50", desc: "No pending obligations. Bandwidth is free for new strategic pursuits." };
    if (pct < 40) return { label: "Comfortable", color: "text-emerald-950 bg-emerald-100/60 border-emerald-200/50", desc: "Plenty of room for extra commitments. Pace is balanced." };
    if (pct < 75) return { label: "Moderate Strain", color: "text-amber-950 bg-amber-100/60 border-amber-200/50", desc: "Workload is picking up. Prioritize critical subtasks." };
    return { label: "Severe Overload", color: "text-rose-950 bg-rose-100/60 border-rose-200/50", desc: "High threat of missed deadlines. Postpone any extra initiatives." };
  };

  const status = getWorkloadStatus(workloadPercentage);

  return (
    <div className="border border-[#1A1A1A]/10 bg-[#FAF9F6] p-6 rounded-sm font-sans space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border border-[#1A1A1A]/20 flex items-center justify-center rounded-none bg-[#1A1A1A]/5">
          <Clock className="w-4 h-4 text-[#1A1A1A]" />
        </div>
        <div>
          <h2 className="text-base font-serif italic text-[#1A1A1A] font-light">Availability Agent</h2>
          <p className="text-[11px] text-[#1A1A1A]/60 font-medium">Real-time scheduling collision logic & capacity calculations.</p>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-[#1A1A1A]/10 bg-[#EFEDE9] p-4 rounded-none">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 block mb-1 font-mono">
            Workload Balance
          </span>
          <span className="text-2xl font-serif italic text-[#1A1A1A]">
            {pendingHours} <span className="text-xs font-sans font-medium text-[#1A1A1A]/40">/ {weeklyCapacityHours}h planned</span>
          </span>
          <div className="w-full h-1 bg-[#1A1A1A]/10 mt-3.5">
            <div 
              className="h-full bg-[#1A1A1A] transition-all duration-500"
              style={{ width: `${Math.min(100, workloadPercentage)}%` }}
            />
          </div>
          <span className="text-[10px] text-[#1A1A1A]/50 font-medium block mt-1.5 font-mono">
            {workloadPercentage}% of weekly focus capacity
          </span>
        </div>

        <div className="border border-[#1A1A1A]/10 bg-[#EFEDE9] p-4 rounded-none flex flex-col justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 block mb-1 font-mono">
              System Velocity Status
            </span>
            <span className={`inline-block px-2 py-0.5 border text-[10px] font-mono font-bold uppercase tracking-wider ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-[11px] text-[#1A1A1A]/70 font-normal leading-relaxed mt-2">
            {status.desc}
          </p>
        </div>
      </div>

      {/* FR-6 Scheduling Conflicts Visualizer */}
      <div className="border-t border-[#1A1A1A]/10 pt-5">
        <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 block mb-3 font-mono">
          Collision Analysis & Warning Registers
        </span>
        
        {conflictsList.length === 0 ? (
          <div className="border border-emerald-900/10 bg-emerald-50/60 p-4 flex items-start gap-3 text-emerald-950">
            <Check className="w-4 h-4 shrink-0 text-emerald-800 mt-0.5" />
            <div>
              <span className="font-serif italic font-medium block text-sm">No Scheduling Collisions Flagged</span>
              <p className="text-emerald-900/70 text-[11px] font-normal leading-normal mt-0.5">
                All deadlines are nicely distributed across calendar slots. Capacity remains stable.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {conflictsList.map((conflict, idx) => (
              <div 
                key={idx} 
                className="border border-rose-900/10 bg-rose-50/60 p-4 flex items-start gap-3 text-rose-950"
              >
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-800 mt-0.5" />
                <div>
                  <span className="font-serif italic font-medium block text-sm">Temporal Overlap Detected</span>
                  <p className="text-rose-900/70 text-[11px] font-mono leading-relaxed mt-1">
                    {conflict}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
