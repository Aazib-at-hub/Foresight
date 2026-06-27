import React from "react";
import { DailyAuditReport } from "../types";
import { X, ClipboardList, Sparkles, AlertCircle, Flame } from "lucide-react";

interface DailyAuditModalProps {
  report: DailyAuditReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyAuditModal({ report, isOpen, onClose }: DailyAuditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white border border-[#1A1A1A]/20 w-full max-w-2xl overflow-hidden rounded-none shadow-[0_24px_60px_rgba(26,26,26,0.1)]">
        
        {/* Modal Header */}
        <div className="border-b border-[#1A1A1A]/10 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[#1A1A1A]/20 bg-[#1A1A1A]/5 flex items-center justify-center rounded-none">
              <ClipboardList className="w-4 h-4 text-[#1A1A1A]" />
            </div>
            <div>
              <h2 className="text-lg font-serif italic text-[#1A1A1A]">Daily Commitment Audit</h2>
              <p className="text-[10px] text-[#1A1A1A]/60 font-medium font-mono uppercase tracking-wider">Strategic risk report compiled by Foresight Auditor</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 border border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] transition-colors cursor-pointer rounded-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        {report ? (
          <div className="p-6 md:p-8 space-y-6 max-h-[65vh] overflow-y-auto">
            
            {/* Health Score Overview */}
            <div className="flex flex-col sm:flex-row items-center gap-6 border border-[#1A1A1A]/10 bg-[#FAF9F6] p-5 rounded-none">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#EFEDE9"
                    strokeWidth="3"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={report.healthScore >= 80 ? "#065f46" : report.healthScore >= 60 ? "#92400e" : "#991b1b"}
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - report.healthScore / 100)}`}
                    strokeLinecap="square"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-sm font-bold tracking-tight text-[#1A1A1A] font-mono">{report.healthScore}%</span>
              </div>
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 block font-mono">
                  Calculated Security Quotient
                </span>
                <p className="text-xs text-[#1A1A1A]/85 leading-relaxed font-normal">
                  {report.summary}
                </p>
              </div>
            </div>

            {/* Risk Highlights */}
            <div className="space-y-3">
              <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 font-mono flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#1A1A1A]/60 shrink-0" />
                Risk Bottlenecks & Anomaly Vectors
              </span>
              <div className="grid md:grid-cols-2 gap-3">
                {report.riskHighlights.map((highlight, idx) => (
                  <div 
                    key={idx}
                    className="p-4 border border-rose-900/10 bg-rose-50/40 text-xs text-rose-950 font-medium leading-relaxed flex items-start gap-2.5 rounded-none"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-800 shrink-0 mt-0.5" />
                    <span className="font-mono">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgent Recommended Actions */}
            <div className="space-y-3 border-t border-[#1A1A1A]/10 pt-5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 font-mono flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                Urgent Strategic Action Plans
              </span>
              <div className="space-y-2.5">
                {report.urgentActions.map((action, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 border border-[#1A1A1A]/10 bg-[#FAF9F6] text-xs text-[#1A1A1A]/85 leading-relaxed flex items-start gap-3.5 rounded-none"
                  >
                    <span className="w-5 h-5 bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-bold font-mono shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="font-normal">{action}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <span className="inline-block w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin"></span>
            <p className="text-xs text-[#1A1A1A]/60 font-mono">Auditing Agent is conducting real-time risk inspections...</p>
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-[#FAF9F6] border-t border-[#1A1A1A]/10 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-black text-[#F4F1EE] text-[10px] font-bold font-mono uppercase tracking-widest cursor-pointer rounded-none"
          >
            Acknowledge Audit
          </button>
        </div>

      </div>
    </div>
  );
}
