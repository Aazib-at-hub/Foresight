import React from "react";
import { Commitment, Subtask } from "../types";
import { Sparkles, Activity, AlertTriangle, CheckSquare } from "lucide-react";

interface DailyAIBriefingProps {
  commitments: Commitment[];
  subtasks: Subtask[];
}

export default function DailyAIBriefing({ commitments, subtasks }: DailyAIBriefingProps) {
  const activeCount = commitments.filter((c) => c.status === "Active").length;
  const highRiskCount = commitments.filter(
    (c) => c.status === "Active" && (c.riskLevel === "Critical" || c.riskLevel === "High")
  ).length;

  const totalHours = subtasks
    .filter((s) => s.status !== "Completed")
    .reduce((sum, s) => sum + s.estimatedHours, 0);

  // Fallback for empty state
  if (activeCount === 0) {
    return (
      <div className="border border-[#1A1A1A]/10 bg-white p-5 rounded-none font-sans space-y-3">
        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A]/40">
          <Sparkles className="w-3.5 h-3.5" /> Daily AI Portfolio Briefing
        </div>
        <p className="text-xs text-[#1A1A1A]/60 font-serif italic">
          Obligation ledger is currently unpopulated. Add a commitment using standard language input to initiate AI capacity auditing and daily brief generation.
        </p>
      </div>
    );
  }

  // Dynamic advice based on risk count
  let directiveTitle = "Maintain Standard Milestone Pace";
  let directiveBody = "Your scheduled commitments are balanced and within normal cognitive and temporal bandwidth limits. Proceed with today's action plan.";
  let priorityTask = "No urgent bottlenecks detected.";

  if (highRiskCount > 0) {
    directiveTitle = "Prevent Friday Deadline Congestion";
    directiveBody = `AI capacity diagnostics flagged ${highRiskCount} obligations with overlapping delivery paths. Temporal required density exceeds typical daily focus boundaries by 4 hours. Scope adjustment is highly advised.`;
    
    const criticalCommitment = commitments.find(
      (c) => c.status === "Active" && (c.riskLevel === "Critical" || c.riskLevel === "High")
    );
    if (criticalCommitment) {
      priorityTask = `Deploy intervention or trigger recovery on "${criticalCommitment.title}" immediately to unblock bottleneck subtasks.`;
    }
  }

  return (
    <div className="border border-[#1A1A1A]/15 bg-white p-6 rounded-none font-sans space-y-5 relative overflow-hidden">
      
      {/* Decorative background watermark */}
      <div className="absolute right-3 top-3 opacity-[0.03] select-none pointer-events-none text-[80px] font-serif font-black italic">
        A.I.
      </div>

      <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A]/50">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          Foresight Strategic Portfolio Brief
        </div>
        <span className="text-[8px] font-mono text-[#1A1A1A]/40 uppercase tracking-wider font-semibold">
          SYSTEM HEALTH: {highRiskCount > 0 ? "ATTENTION REQUIRED" : "SAFE BOUNDS"}
        </span>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-3 gap-4 border-b border-[#1A1A1A]/5 pb-4">
        <div>
          <span className="text-[8px] uppercase tracking-wider text-[#1A1A1A]/50 font-mono block">
            Obligations Analyzed
          </span>
          <span className="text-xl font-serif italic font-medium text-[#1A1A1A]">
            {activeCount} active
          </span>
        </div>
        <div>
          <span className="text-[8px] uppercase tracking-wider text-[#1A1A1A]/50 font-mono block">
            Conflict Thresholds
          </span>
          <span className={`text-xl font-serif italic font-medium ${highRiskCount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
            {highRiskCount} flagged
          </span>
        </div>
        <div>
          <span className="text-[8px] uppercase tracking-wider text-[#1A1A1A]/50 font-mono block">
            Incomplete Milestones
          </span>
          <span className="text-xl font-serif italic font-medium text-[#1A1A1A]">
            {subtasks.filter((s) => s.status !== "Completed").length} tasks ({totalHours}h)
          </span>
        </div>
      </div>

      {/* Editorial Content */}
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 font-mono block">
            Today's Strategic Directive
          </span>
          <h4 className="text-sm font-serif italic font-bold text-[#1A1A1A]">
            {directiveTitle}
          </h4>
          <p className="text-xs text-[#1A1A1A]/80 leading-relaxed font-normal font-serif italic">
            {directiveBody}
          </p>
        </div>

        <div className="space-y-1.5 border-t border-[#1A1A1A]/5 pt-3">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 font-mono block">
            Primary Focus Vector
          </span>
          <div className="flex items-start gap-2 text-xs text-[#1A1A1A]/90">
            <span className="p-0.5 bg-rose-50 text-rose-800 border border-rose-100 shrink-0 text-[8px] font-mono uppercase font-bold rounded">
              PRIORITY
            </span>
            <span className="font-medium font-serif italic">{priorityTask}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
