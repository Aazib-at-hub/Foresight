import React, { useState } from "react";
import { Commitment, Subtask, Intervention, RecoveryPlan } from "../types";
import { 
  CheckSquare, 
  Square, 
  ShieldAlert, 
  Sparkles, 
  ChevronRight, 
  Wrench, 
  RefreshCw, 
  Mail, 
  Copy, 
  Check, 
  Activity, 
  ThumbsUp, 
  Clock,
  Calendar as CalendarIcon
} from "lucide-react";
import { auth, db, collection, addDoc } from "../firebase";
import { getCachedToken, connectGoogleCalendar, createGoogleEvent } from "../services/googleCalendar";

interface SelectedCommitmentDetailProps {
  commitment: Commitment;
  subtasks: Subtask[];
  interventions: Intervention[];
  onToggleSubtask: (subtask: Subtask) => void;
  onApplyIntervention: (intervention: Intervention) => void;
  onGenerateRecoveryPlan: (commitment: Commitment) => Promise<RecoveryPlan>;
  onGenerateNegotiationDraft: (commitment: Commitment, type: string, reason: string) => Promise<string>;
}

export default function SelectedCommitmentDetail({
  commitment,
  subtasks,
  interventions,
  onToggleSubtask,
  onApplyIntervention,
  onGenerateRecoveryPlan,
  onGenerateNegotiationDraft
}: SelectedCommitmentDetailProps) {
  
  // Local state for Recovery Agent
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan | null>(null);
  const [loadingRecovery, setLoadingRecovery] = useState(false);

  // Local state for Negotiation Agent
  const [negotiationType, setNegotiationType] = useState("email");
  const [negotiationReason, setNegotiationReason] = useState("unforeseen scheduling overlaps");
  const [negotiationDraft, setNegotiationDraft] = useState("");
  const [loadingNegotiation, setLoadingNegotiation] = useState(false);
  const [copied, setCopied] = useState(false);

  // Google Calendar Integration State
  const [exportingGoogle, setExportingGoogle] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(!!getCachedToken());

  const handleExportToGoogleCalendar = async () => {
    try {
      setExportingGoogle(true);
      
      let token = getCachedToken();
      if (!token) {
        const confirmedConnect = window.confirm("Connect to your Google Calendar to export this obligation?");
        if (!confirmedConnect) {
          setExportingGoogle(false);
          return;
        }
        token = await connectGoogleCalendar();
        setGoogleConnected(true);
      }

      // Explicit user confirmation (Mandatory for Workspace actions)
      const confirmed = window.confirm(
        `Export "${commitment.title}" to your Google Calendar on ${commitment.deadline}?`
      );
      if (!confirmed) {
        setExportingGoogle(false);
        return;
      }

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

      await createGoogleEvent({
        summary: commitment.title,
        description: commitment.explanation || "Foresight Obligation Ledger Entry",
        startDateTime: startISO,
        endDateTime: endISO,
      });

      alert("Successfully scheduled event on Google Calendar!");
      
      // Write Firestore notification
      if (auth.currentUser) {
        await addDoc(collection(db, "notifications"), {
          userId: auth.currentUser.uid,
          title: "Google Calendar Exported",
          message: `Obligation "${commitment.title}" has been successfully exported to your primary Google Calendar.`,
          type: "success",
          read: false,
          createdAt: new Date().toISOString()
        });
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to export to Google Calendar.");
    } finally {
      setExportingGoogle(false);
    }
  };

  // Filter subtasks and interventions for this commitment
  const commitmentSubtasks = subtasks.filter(s => s.commitmentId === commitment.id);
  const commitmentInterventions = interventions.filter(i => i.commitmentId === commitment.id);

  // Calculate completed subtasks count
  const completedSubtasks = commitmentSubtasks.filter(s => s.status === "Completed").length;
  const totalSubtasks = commitmentSubtasks.length;

  const handleFetchRecovery = async () => {
    setLoadingRecovery(true);
    try {
      const plan = await onGenerateRecoveryPlan(commitment);
      setRecoveryPlan(plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecovery(false);
    }
  };

  const handleFetchNegotiation = async () => {
    setLoadingNegotiation(true);
    try {
      const draft = await onGenerateNegotiationDraft(commitment, negotiationType, negotiationReason);
      setNegotiationDraft(draft);
      setCopied(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNegotiation(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(negotiationDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if recovery mode should be recommended/triggered (Risk level is High or Critical)
  const isCritical = commitment.riskLevel === "Critical" || commitment.riskLevel === "High";

  return (
    <div className="border border-[#1A1A1A]/10 bg-white p-6 rounded-none font-sans space-y-6">
      
      {/* Commitment Title Header */}
      <div>
        <div className="flex items-center gap-1.5 text-[#1A1A1A]/50 font-mono text-[9px] uppercase font-bold tracking-wider">
          <Activity className="w-3 h-3" /> Commitment Analysis Cockpit
        </div>
        <h2 className="text-2xl font-serif italic font-light text-[#1A1A1A] tracking-tight mt-1">
          {commitment.title}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1A1A1A]/5">
          <div className="text-[11px] text-[#1A1A1A]/60 font-mono">
            Target Deadline: <span className="text-[#1A1A1A] font-bold">{commitment.deadline}</span> &bull; Tier: <span className="text-[#1A1A1A] font-bold">{commitment.priority} Priority</span>
          </div>
          <button
            onClick={handleExportToGoogleCalendar}
            disabled={exportingGoogle}
            className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase border border-[#1A1A1A]/20 hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] transition-all cursor-pointer flex items-center gap-1.5"
            title="Add this commitment to Google Calendar"
          >
            <CalendarIcon className="w-3 h-3" />
            {exportingGoogle ? "Exporting..." : "Export to GCal"}
          </button>
        </div>
      </div>

      {/* FR-7 Risk Explanation Badge */}
      <div className="border border-[#1A1A1A]/10 bg-[#FAF9F6] p-4.5 rounded-none space-y-2">
        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A]/50">
          <ShieldAlert className="w-3.5 h-3.5 text-[#1A1A1A]/50" />
          AI Forecast Diagnostics
        </div>
        <p className="text-xs text-[#1A1A1A]/80 leading-relaxed font-normal">
          {commitment.explanation || "Diagnostic parser is analyzing capacity variables, deadline proximity, and milestone density..."}
        </p>
      </div>

      {/* FR-4 Subtasks / Milestones list */}
      <div className="border-t border-[#1A1A1A]/10 pt-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 font-mono">
              Actionable Milestones
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#1A1A1A]/5 text-[#1A1A1A]/60 font-bold border border-[#1A1A1A]/10">
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
          <span className="text-[9px] text-[#1A1A1A]/40 font-bold font-mono">Ledger FR-4</span>
        </div>

        {commitmentSubtasks.length === 0 ? (
          <p className="text-xs text-[#1A1A1A]/40 italic">No milestone items defined in the workspace register.</p>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {commitmentSubtasks.map((subtask, idx) => (
              <div 
                key={subtask.id || idx}
                onClick={() => onToggleSubtask(subtask)}
                className={`flex items-center justify-between p-3 border transition-all cursor-pointer rounded-none ${
                  subtask.status === "Completed"
                    ? "bg-[#1A1A1A]/5 border-[#1A1A1A]/10 text-[#1A1A1A]/40"
                    : "bg-white border-[#1A1A1A]/10 hover:border-[#1A1A1A] text-[#1A1A1A]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {subtask.status === "Completed" ? (
                    <CheckSquare className="w-4 h-4 text-[#1A1A1A] shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-[#1A1A1A]/30 shrink-0" />
                  )}
                  <span className={`text-xs font-medium truncate ${subtask.status === "Completed" ? "line-through" : ""}`}>
                    {subtask.title}
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold text-[#1A1A1A]/60 bg-[#1A1A1A]/5 border border-[#1A1A1A]/5 px-2 py-0.5 rounded-none shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3 opacity-60" /> {subtask.estimatedHours}h
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FR-9 Intervention Agent Section */}
      <div className="border-t border-[#1A1A1A]/10 pt-5">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 font-mono">
            Proactive Interventions
          </span>
          <span className="text-[9px] text-[#1A1A1A]/40 font-bold font-mono">Mitigation FR-9</span>
        </div>

        {commitmentInterventions.length === 0 ? (
          <div className="border border-[#1A1A1A]/10 bg-[#FAF9F6] p-4 text-center">
            <p className="text-xs text-[#1A1A1A]/60 font-medium font-serif italic">No proactive interventions required at this depth level.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {commitmentInterventions.map((intervention, idx) => (
              <div 
                key={intervention.id || idx}
                className="border border-[#1A1A1A]/10 bg-[#FAF9F6] p-4 space-y-3 rounded-none hover:border-[#1A1A1A]/30 transition-colors"
              >
                <p className="text-xs text-[#1A1A1A]/80 leading-relaxed font-normal">
                  {intervention.recommendation}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-900 flex items-center gap-1 font-bold">
                    <ThumbsUp className="w-3 h-3 shrink-0" /> Impact: {intervention.impact}
                  </span>
                  <button
                    onClick={() => onApplyIntervention(intervention)}
                    className="px-2.5 py-1 bg-white border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] rounded-none transition-all cursor-pointer font-bold uppercase text-[9px] tracking-wider"
                  >
                    Deploy Fix
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FR-10 Recovery Mode Agent Section */}
      {isCritical && (
        <div className="border-t border-[#1A1A1A] pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 border border-rose-900 bg-rose-950 text-rose-100 text-[8px] font-mono uppercase tracking-widest rounded-none">
                Risk Warning
              </span>
              <span className="text-xs font-bold text-rose-900 font-mono">FR-10 Recovery State Active</span>
            </div>
            <span className="text-[9px] text-[#1A1A1A]/40 font-bold font-mono">Recovery Node</span>
          </div>

          {!recoveryPlan ? (
            <button
              onClick={handleFetchRecovery}
              disabled={loadingRecovery}
              className="w-full py-2.5 bg-[#1A1A1A] hover:bg-black text-[#F4F1EE] font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 rounded-none"
            >
              <Wrench className="w-3.5 h-3.5 shrink-0" />
              {loadingRecovery ? "Synthesizing Recovery Matrix..." : "Activate AI Recovery Protocol"}
            </button>
          ) : (
            <div className="border border-[#1A1A1A]/20 bg-[#FAF9F6] p-4.5 space-y-4 rounded-none">
              <div className="flex justify-between items-center border-b border-[#1A1A1A]/10 pb-2">
                <span className="text-xs font-serif italic font-medium text-[#1A1A1A] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Active Recovery Action Plan
                </span>
                <button 
                  onClick={handleFetchRecovery} 
                  className="p-1 text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors cursor-pointer"
                  title="Recalculate Plan"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              {/* Day by Day Schedule */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 block font-mono">
                  Calendar Schedule Rebuilding
                </span>
                <ul className="space-y-1.5">
                  {recoveryPlan.scheduleRebuilding.map((step, idx) => (
                    <li key={idx} className="text-xs text-[#1A1A1A]/85 flex items-start gap-1.5 leading-relaxed font-normal">
                      <ChevronRight className="w-3 h-3 text-[#1A1A1A]/40 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Scope Optimization */}
              <div className="space-y-1.5 border-t border-[#1A1A1A]/10 pt-3">
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 block font-mono">
                  Scope Rationalization
                </span>
                <ul className="space-y-1.5">
                  {recoveryPlan.scopeOptimization.map((step, idx) => (
                    <li key={idx} className="text-xs text-[#1A1A1A]/85 flex items-start gap-1.5 leading-relaxed font-normal">
                      <ChevronRight className="w-3 h-3 text-[#1A1A1A]/40 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prioritized steps */}
              <div className="space-y-1.5 border-t border-[#1A1A1A]/10 pt-3">
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 block font-mono">
                  Critical Path Deliverables
                </span>
                <ul className="space-y-1.5">
                  {recoveryPlan.prioritizedSteps.map((step, idx) => (
                    <li key={idx} className="text-xs text-[#1A1A1A]/85 flex items-start gap-1.5 leading-relaxed font-normal">
                      <ChevronRight className="w-3 h-3 text-[#1A1A1A]/40 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FR-11 Negotiation Draft Generator */}
      <div className="border-t border-[#1A1A1A]/10 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 font-mono">
            Extension Negotiation Agent
          </span>
          <span className="text-[9px] text-[#1A1A1A]/40 font-bold font-mono">Drafting FR-11</span>
        </div>

        <div className="space-y-3 border border-[#1A1A1A]/10 bg-[#FAF9F6] p-4.5 rounded-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 block mb-1 font-mono">
                Recipient Channel
              </label>
              <select
                value={negotiationType}
                onChange={(e) => setNegotiationType(e.target.value)}
                className="w-full text-xs bg-white border border-[#1A1A1A]/20 rounded-none p-1.5 font-medium focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="email">Professional Email</option>
                <option value="slack">Slack / Teams Chat</option>
                <option value="client">Client Update Memo</option>
              </select>
            </div>
            <div>
              <label className="text-[8px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 block mb-1 font-mono">
                Reason / context
              </label>
              <input
                type="text"
                value={negotiationReason}
                onChange={(e) => setNegotiationReason(e.target.value)}
                className="w-full text-xs bg-white border border-[#1A1A1A]/20 rounded-none p-1.5 font-medium focus:outline-none focus:border-[#1A1A1A]"
                placeholder="e.g. sick, scope overlap"
              />
            </div>
          </div>

          <button
            onClick={handleFetchNegotiation}
            disabled={loadingNegotiation}
            className="w-full py-2 bg-[#1A1A1A] hover:bg-black text-[#F4F1EE] font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 rounded-none mt-1"
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            {loadingNegotiation ? "Synthesizing Persuasive Message..." : "Draft Extension Message"}
          </button>

          {negotiationDraft && (
            <div className="mt-4 border-t border-[#1A1A1A]/10 pt-3 space-y-2">
              <div className="flex items-center justify-between text-[9px] font-mono uppercase font-bold tracking-wider text-[#1A1A1A]/40">
                <span>Negotiation Copy Block</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 transition-colors font-bold cursor-pointer uppercase font-mono"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Memo
                    </>
                  )}
                </button>
              </div>
              <textarea
                readOnly
                value={negotiationDraft}
                className="w-full h-32 text-xs bg-white border border-[#1A1A1A]/10 rounded-none p-2.5 font-mono text-[#1A1A1A]/80 leading-relaxed focus:outline-none resize-none"
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
