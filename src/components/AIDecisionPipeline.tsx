import React from "react";
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";

interface AIDecisionPipelineProps {
  isAuditing: boolean;
  activeAgentIndex: number;
}

export default function AIDecisionPipeline({
  isAuditing,
  activeAgentIndex,
}: AIDecisionPipelineProps) {
  const stages = [
    { name: "Planner Agent", desc: "Interprets language input, logs commitments and dates" },
    { name: "Decomposition Agent", desc: "Deconstructs work vectors into discrete hour-mode tasks" },
    { name: "Availability Agent", desc: "Cross-references calendars, maps capacity and temporal conflicts" },
    { name: "Intervention Agent", desc: "Calculates dynamic risk mitigations and proactive success boosts" },
    { name: "Negotiation Agent", desc: "Formulates professional grace communications and delay options" },
    { name: "Daily Audit Compiler", desc: "Aggregates overall portfolio health index & failure boundaries" },
  ];

  return (
    <div className="border border-[#1A1A1A]/10 bg-white p-5 rounded-none font-sans space-y-4">
      <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A]/50">
          <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A]/50 animate-pulse" />
          AI Agent Decision Pipeline
        </div>
        <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 border ${
          isAuditing ? "bg-amber-50 text-amber-800 border-amber-200 font-extrabold animate-pulse" : "bg-emerald-50 text-emerald-800 border-emerald-200"
        }`}>
          {isAuditing ? `PROCESSING: STAGE ${activeAgentIndex + 1}/6` : "System Standby / Idle"}
        </span>
      </div>

      <div className="space-y-2">
        {stages.map((stage, idx) => {
          let status = "pending";
          if (isAuditing) {
            if (idx < activeAgentIndex) status = "completed";
            else if (idx === activeAgentIndex) status = "running";
          } else {
            status = "idle";
          }

          return (
            <div 
              key={idx} 
              className={`flex items-start gap-3 p-2.5 border transition-all rounded-none ${
                status === "running" 
                  ? "bg-[#1A1A1A]/5 border-[#1A1A1A] pl-3.5" 
                  : "border-transparent opacity-85"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {status === "completed" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                )}
                {status === "running" && (
                  <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                )}
                {status === "pending" && (
                  <Circle className="w-4 h-4 text-[#1A1A1A]/20" />
                )}
                {status === "idle" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600/65" />
                )}
              </div>
              <div className="space-y-0.5">
                <span className={`text-xs font-mono font-bold block ${
                  status === "running" ? "text-amber-800" : "text-[#1A1A1A]"
                }`}>
                  {stage.name}
                </span>
                <p className="text-[10px] text-[#1A1A1A]/60 leading-normal font-normal">
                  {stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
