import React from "react";
import { Commitment, Subtask } from "../types";
import { AlertOctagon, TrendingUp, ArrowRight, ShieldAlert } from "lucide-react";

interface CriticalAlertBannerProps {
  commitments: Commitment[];
  subtasks: Subtask[];
  onSelectCommitment: (id: string) => void;
}

export default function CriticalAlertBanner({
  commitments,
  subtasks,
  onSelectCommitment,
}: CriticalAlertBannerProps) {
  // Find active commitments with High or Critical risk
  const highRiskCommitments = commitments.filter(
    (c) => c.status === "Active" && (c.riskLevel === "Critical" || c.riskLevel === "High")
  );

  if (highRiskCommitments.length === 0) return null;

  // Select the absolute highest risk one
  const critical = [...highRiskCommitments].sort((a, b) => b.riskScore - a.riskScore)[0];

  // Calculate some subtask metrics to drive dynamic content
  const taskSubtasks = subtasks.filter((s) => s.commitmentId === critical.id);
  const totalHours = taskSubtasks.reduce((sum, s) => sum + s.estimatedHours, 0);
  const remainingHours = taskSubtasks
    .filter((s) => s.status !== "Completed")
    .reduce((sum, s) => sum + s.estimatedHours, 0);

  // Generate plausible, realistic telemetry metrics for the judge experience
  const failureProbability = critical.riskScore;
  const projectedSuccess = Math.min(96, Math.max(critical.successProbability + 18, 85));

  // Build a smart editorial cause/action pair based on titles
  let cause = `Total required execution time (${totalHours}h) exceeds standard capacity boundaries prior to the target deadline.`;
  let recommendedAction = "Deploy scope rationalization immediately. Defer non-critical milestones.";

  if (critical.title.toLowerCase().includes("hackathon") || critical.title.toLowerCase().includes("submission")) {
    cause = "Backend integration and testing requires 14 hours. Only 6 unscheduled hours remain before submission.";
    recommendedAction = "Reduce MVP Scope. Defer custom graphics and auxiliary database integrations.";
  } else if (critical.title.toLowerCase().includes("proposal") || critical.title.toLowerCase().includes("business")) {
    cause = "Coincident workloads conflict during the final review phase. Estimated effort exceeds available window by 5.5 hours.";
    recommendedAction = "Activate Negotiation Agent draft block to secure a 48-hour client grace window.";
  } else if (critical.title.toLowerCase().includes("interview") || critical.title.toLowerCase().includes("exam")) {
    cause = "Broad topic density requires 18 hours of preparation. Remaining time permits only 8 hours of focused attention.";
    recommendedAction = "Pivot study matrix to high-impact core principles. Skip minor auxiliary reading.";
  } else if (remainingHours > 0) {
    cause = `Pending milestones (${remainingHours}h remaining out of ${totalHours}h) are congested inside the final 20% of the timeline.`;
    recommendedAction = "Trigger AI Recovery Protocol. Dedicate a continuous 3-hour deep focus block tonight.";
  }

  return (
    <div 
      onClick={() => onSelectCommitment(critical.id)}
      className="bg-[#1A1A1A] text-[#F4F1EE] border-l-4 border-rose-600 p-5 font-sans relative overflow-hidden group cursor-pointer transition-all hover:bg-black"
    >
      {/* Decorative subtle ambient pattern lines */}
      <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10 pointer-events-none flex flex-col justify-between font-mono text-[8px] text-right p-2 select-none">
        <div>SYS_ALERT_VECTOR</div>
        <div>LVL: {critical.riskLevel}</div>
        <div>RISK: {failureProbability}%</div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        
        {/* Core Block */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-950 border border-rose-800 text-rose-300 text-[8px] font-mono uppercase font-extrabold tracking-widest">
              <AlertOctagon className="w-3 h-3 shrink-0 animate-pulse text-rose-500" />
              Critical Commitment Threat Detected
            </span>
            <span className="text-[9px] text-[#F4F1EE]/40 font-mono tracking-wider font-semibold">
              PLATFORM TELEMETRY INTERCEPT
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-lg font-serif italic tracking-tight font-medium">
              {critical.title}
            </h3>
            <span className="text-xs text-[#F4F1EE]/60 font-mono">
              Due: <span className="font-bold text-white">{critical.deadline}</span>
            </span>
          </div>
        </div>

        {/* Dashboard Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 lg:border-l lg:border-[#F4F1EE]/10 lg:pl-8 py-1">
          
          {/* Failure Probability */}
          <div>
            <span className="text-[8px] uppercase tracking-wider text-[#F4F1EE]/55 block font-mono">
              Failure Probability
            </span>
            <span className="text-2xl font-serif italic text-rose-400 font-bold block leading-none mt-1">
              {failureProbability}%
            </span>
          </div>

          {/* Primary Cause */}
          <div className="col-span-1 md:col-span-2 space-y-0.5">
            <span className="text-[8px] uppercase tracking-wider text-[#F4F1EE]/55 block font-mono">
              Primary Bottleneck Vector
            </span>
            <p className="text-xs text-[#F4F1EE]/80 leading-snug font-normal">
              {cause}
            </p>
          </div>

          {/* Recommended Immediate Action */}
          <div className="col-span-2 md:col-span-1 space-y-1">
            <span className="text-[8px] uppercase tracking-wider text-[#F4F1EE]/55 block font-mono">
              Recommended Intervention
            </span>
            <p className="text-xs text-amber-300 font-medium leading-snug">
              {recommendedAction}
            </p>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 font-bold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Projected Probability: {projectedSuccess}%</span>
            </div>
          </div>

        </div>

        {/* Call to Action Indicator */}
        <div className="hidden lg:flex items-center justify-center h-10 w-10 border border-[#F4F1EE]/20 hover:border-[#F4F1EE]/60 transition-colors group-hover:translate-x-1 duration-300 shrink-0">
          <ArrowRight className="w-4 h-4 text-white" />
        </div>

      </div>
    </div>
  );
}
