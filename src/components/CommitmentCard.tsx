import React from "react";
import { Commitment, Subtask } from "../types";
import { Calendar, CheckCircle, Trash2 } from "lucide-react";

interface CommitmentCardProps {
  commitment: Commitment;
  subtasks?: Subtask[];
  onSelect: (commitment: Commitment) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onToggleComplete: (commitment: Commitment, e: React.MouseEvent) => void;
  isSelected: boolean;
  key?: React.Key;
}

export default function CommitmentCard({
  commitment,
  subtasks = [],
  onSelect,
  onDelete,
  onToggleComplete,
  isSelected
}: CommitmentCardProps) {
  
  const getPriorityBadge = (priority: "High" | "Medium" | "Low") => {
    switch (priority) {
      case "High":
        return "bg-rose-100/60 border-rose-200 text-rose-950";
      case "Medium":
        return "bg-amber-100/60 border-amber-200 text-amber-950";
      case "Low":
        return "bg-emerald-100/60 border-emerald-200 text-emerald-950";
    }
  };

  const getRiskBadge = (level: "Low" | "Medium" | "High" | "Critical") => {
    switch (level) {
      case "Critical":
        return "bg-rose-950 text-rose-100 border-rose-900 font-extrabold animate-pulse";
      case "High":
        return "bg-[#1A1A1A]/90 text-white border-[#1A1A1A] font-bold";
      case "Medium":
        return "bg-amber-50/80 text-amber-900 border-amber-200 font-semibold";
      case "Low":
        return "bg-emerald-50/80 text-emerald-900 border-emerald-200 font-medium";
    }
  };

  const getProgressBarColor = (probability: number) => {
    if (probability >= 80) return "bg-[#1A1A1A]";
    if (probability >= 60) return "bg-[#1A1A1A]/80";
    if (probability >= 40) return "bg-[#1A1A1A]/50";
    return "bg-rose-800";
  };

  const totalSubtasksCount = subtasks.length;
  const completedSubtasksCount = subtasks.filter(s => s.status === "Completed").length;
  const completionPercentage = totalSubtasksCount > 0 
    ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) 
    : 0;

  // Generate points for the sparkline path
  const generateSparklineData = () => {
    if (totalSubtasksCount === 0) return null;
    
    const points: { x: number; y: number; title: string; status: string }[] = [];
    const n = totalSubtasksCount;
    const width = 200;
    const height = 40;
    const padding = 6;
    const chartHeight = height - padding * 2;
    
    // Start point: (0, 100% y-coordinate = bottom of chart area)
    points.push({
      x: 0,
      y: height - padding,
      title: "Commencement",
      status: "Completed"
    });
    
    let completedSoFar = 0;
    subtasks.forEach((subtask, index) => {
      if (subtask.status === "Completed") {
        completedSoFar++;
      }
      const x = ((index + 1) / n) * width;
      const progressRatio = completedSoFar / n;
      const y = (height - padding) - (progressRatio * chartHeight);
      points.push({
        x,
        y,
        title: subtask.title,
        status: subtask.status
      });
    });
    
    return points;
  };

  const points = generateSparklineData();
  const linePath = points ? points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ") : "";
  const areaPath = points ? `${linePath} L 200 40 L 0 40 Z` : "";

  return (
    <div
      onClick={() => onSelect(commitment)}
      className={`group border p-5 transition-all cursor-pointer relative rounded-none ${
        isSelected 
          ? "border-[#1A1A1A] bg-[#FAF9F6] shadow-[0_4px_12px_rgba(26,26,26,0.03)]" 
          : "border-[#1A1A1A]/10 bg-white hover:border-[#1A1A1A]/30"
      }`}
    >
      {/* Decorative vertical color indicator on the left edge */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${
          commitment.riskLevel === "Critical"
            ? "bg-rose-700"
            : commitment.riskLevel === "High"
            ? "bg-[#1A1A1A]"
            : commitment.riskLevel === "Medium"
            ? "bg-amber-500"
            : "bg-emerald-600"
        }`}
      />

      <div className="flex items-start justify-between gap-4 pl-1">
        <div className="flex-grow min-w-0">
          
          {/* Header Row: Priority and Risk Badge */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className={`px-2 py-0.5 border text-[9px] font-mono uppercase tracking-wider rounded-none ${getPriorityBadge(commitment.priority)}`}>
              {commitment.priority}
            </span>
            <span className={`px-2 py-0.5 border text-[9px] font-mono uppercase tracking-wider rounded-none ${getRiskBadge(commitment.riskLevel)}`}>
              {commitment.riskLevel} Risk
            </span>
            {commitment.status === "Completed" && (
              <span className="px-2 py-0.5 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 text-[#1A1A1A]/60 text-[9px] font-mono uppercase tracking-wider rounded-none flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5" /> Filed
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={`text-base font-serif italic font-light tracking-tight text-[#1A1A1A] group-hover:underline decoration-1 transition-colors leading-snug ${
            commitment.status === "Completed" ? "line-through opacity-40" : ""
          }`}>
            {commitment.title}
          </h3>

          {/* Deadline info */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#1A1A1A]/60 mt-3 font-medium">
            <Calendar className="w-3.5 h-3.5 opacity-50 shrink-0" />
            <span>Target: <span className="text-[#1A1A1A] font-bold font-mono">{commitment.deadline}</span></span>
          </div>

        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => onToggleComplete(commitment, e)}
            className={`p-1.5 border transition-all cursor-pointer rounded-none ${
              commitment.status === "Completed"
                ? "bg-[#1A1A1A]/5 border-[#1A1A1A]/20 text-[#1A1A1A]"
                : "bg-[#FAF9F6] border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/5 hover:text-emerald-800 text-[#1A1A1A]/50"
            }`}
            title={commitment.status === "Completed" ? "Re-open" : "Archive Complete"}
          >
            <CheckCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => onDelete(commitment.id, e)}
            className="p-1.5 bg-[#FAF9F6] border border-[#1A1A1A]/10 hover:bg-rose-50 hover:text-rose-800 text-[#1A1A1A]/50 transition-all cursor-pointer rounded-none"
            title="Delete Records"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Section: Execution Metrics */}
      <div className="mt-4 pl-1 border-t border-[#1A1A1A]/5 pt-3 space-y-3">
        {/* Sparkline Timeline Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-[#1A1A1A]/50">
            <span>Subtask Progress Timeline</span>
            <span className="font-mono font-bold text-[#1A1A1A]">
              {completedSubtasksCount}/{totalSubtasksCount} ({completionPercentage}%)
            </span>
          </div>
          
          {points ? (
            <div className="bg-[#FAF9F6] border border-[#1A1A1A]/5 p-1 rounded-none relative">
              <svg viewBox="0 0 200 40" className="w-full h-10 overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`sparkline-grad-${commitment.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A1A1A" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#1A1A1A" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                
                {/* Area under the line */}
                <path d={areaPath} fill={`url(#sparkline-grad-${commitment.id})`} />
                
                {/* Sparkline trendline */}
                <path d={linePath} fill="none" stroke="#1A1A1A" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Step indicators */}
                {points.slice(1).map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={p.status === "Completed" ? 3 : 2}
                    className={`${
                      p.status === "Completed" 
                        ? "fill-[#1A1A1A] stroke-white stroke-[1px]" 
                        : "fill-white stroke-[#1A1A1A]/20 stroke-[1px]"
                    }`}
                  />
                ))}
              </svg>
            </div>
          ) : (
            <div className="py-2.5 px-3 border border-[#1A1A1A]/5 bg-[#1A1A1A]/[0.02] text-center rounded-none">
              <p className="text-[9px] font-mono text-gray-400 italic">No subtask decomposition. Select card to generate with AI.</p>
            </div>
          )}
        </div>

        {/* Calculated Success Probability */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-[#1A1A1A]/50">
            <span>Calculated Success Probability</span>
            <span className="font-mono font-bold text-[#1A1A1A]">
              {commitment.successProbability}%
            </span>
          </div>
          <div className="w-full h-[3px] bg-[#1A1A1A]/10">
            <div
              className={`h-full transition-all duration-500 ${getProgressBarColor(commitment.successProbability)}`}
              style={{ width: `${commitment.successProbability}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
