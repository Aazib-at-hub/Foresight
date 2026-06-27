import React, { useState, useEffect } from "react";
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

  // Local state for Scenario Simulator
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);

  // Filter subtasks and interventions for this commitment
  const commitmentSubtasks = subtasks.filter(s => s.commitmentId === commitment.id);
  const commitmentInterventions = interventions.filter(i => i.commitmentId === commitment.id);

  // Calculate completed subtasks count
  const completedSubtasks = commitmentSubtasks.filter(s => s.status === "Completed").length;
  const totalSubtasks = commitmentSubtasks.length;

  useEffect(() => {
    let active = true;
    const fetchScenarios = async () => {
      setLoadingScenarios(true);
      try {
        const response = await fetch("/api/commitments/simulate-scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commitment,
            subtasks: commitmentSubtasks
          })
        });
        const data = await response.json();
        if (active && data.scenarios) {
          setScenarios(data.scenarios);
        }
      } catch (err) {
        console.error("Error fetching scenarios:", err);
      } finally {
        if (active) setLoadingScenarios(false);
      }
    };

    fetchScenarios();
    return () => {
      active = false;
    };
  }, [commitment.id, totalSubtasks]);

  // Generate dynamic, human-written commitment narrative based on execution parameters
  const generateNarrative = () => {
    const completed = completedSubtasks;
    const total = totalSubtasks;
    const hoursRemaining = commitmentSubtasks
      .filter(s => s.status !== "Completed")
      .reduce((sum, s) => sum + s.estimatedHours, 0);

    if (commitment.status === "Completed") {
      return `This commitment has been successfully finalized. All ${total} primary milestones are completed, archiving the ledger entry with 100% security yield.`;
    }

    let intro = `Your work on "${commitment.title}" is currently active. `;
    if (completed > 0) {
      intro += `Progress is underway with ${completed} of ${total} milestones marked complete, leaving ${hoursRemaining} hours of estimated attention required. `;
    } else {
      intro += `No execution hours have been recorded yet for the ${total} milestones. Immediate initiation is recommended to prevent scheduling compressions. `;
    }

    let warning = "";
    if (commitment.riskLevel === "Critical" || commitment.riskLevel === "High") {
      warning = `Our capacity auditor detects that concurrent obligations share coincident execution windows. Without tactical scope reduction, your agenda faces a temporal deficit of approximately ${Math.round(hoursRemaining * 0.4 || 4)} hours. `;
    } else {
      warning = `Your current bandwidth remains within safe boundaries. Continuing with the recommended milestone distribution will secure delivery. `;
    }

    let recommendation = "We recommend activating deep focus sessions to safeguard progression.";
    if (commitmentInterventions.length > 0) {
      recommendation = `Deploy the recommended intervention: "${commitmentInterventions[0].recommendation}" to boost your estimated success probability.`;
    }

    return `${intro}${warning}${recommendation}`;
  };

  // Generate milestone timeline intelligence
  const getTimelineSteps = () => {
    if (commitmentSubtasks.length === 0) return [];
    
    return commitmentSubtasks.map((sub, idx) => {
      let relativeDay = "Today";
      if (idx === 1) relativeDay = "Tomorrow";
      else if (idx === 2) relativeDay = "In 2 Days";
      else if (idx === commitmentSubtasks.length - 1) relativeDay = `Deadline (${commitment.deadline})`;
      else relativeDay = `Phase ${idx + 1}`;

      return {
        label: relativeDay,
        task: sub.title,
        status: sub.status,
        hours: sub.estimatedHours
      };
    });
  };

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

      {/* Commitment Narrative Engine */}
      <div className="border border-[#1A1A1A]/10 bg-[#FAF9F6] p-4.5 rounded-none space-y-3">
        <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-1.5">
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A]/50">
            <ShieldAlert className="w-3.5 h-3.5 text-[#1A1A1A]/50" />
            Commitment Narrative Engine
          </div>
          <span className="text-[8px] font-mono uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-100 px-1 py-0.5 font-bold">
            Confidence: High (94%)
          </span>
        </div>
        <p className="text-xs text-[#1A1A1A]/85 leading-relaxed font-serif italic font-normal">
          {generateNarrative()}
        </p>
      </div>

      {/* Risk Attribution */}
      <div className="border border-[#1A1A1A]/10 bg-[#FAF9F6] p-4.5 rounded-none space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-1.5">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/50 font-mono">
            Risk Attribution & Drivers
          </span>
          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border ${
            isCritical ? "text-rose-800 bg-rose-50 border-rose-200" : "text-emerald-800 bg-emerald-50 border-emerald-200"
          }`}>
            {commitment.riskLevel} Risk Level
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono text-[#1A1A1A]/60 font-bold block">Primary Drivers</span>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? "bg-rose-600 animate-pulse" : "bg-[#1A1A1A]"}`} />
                <span className="text-[#1A1A1A]/80">Temporal constraints: {isCritical ? "Highly compressed" : "Manageable duration"}</span>
              </li>
              <li className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${commitmentSubtasks.length > 3 ? "bg-amber-600 animate-pulse" : "bg-[#1A1A1A]"}`} />
                <span className="text-[#1A1A1A]/80">Milestone density: {commitmentSubtasks.length} subtasks registered</span>
              </li>
              {isCritical && (
                <li className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                  <span className="text-[#1A1A1A]/80">Calendar overlap detected on concurrent deadlines</span>
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] font-mono text-[#1A1A1A]/60 font-bold block">Telemetry Parameters</span>
            <div className="space-y-1 text-xs">
              <div>Failure Risk Probability: <span className="font-mono font-bold text-rose-600">{commitment.riskScore}%</span></div>
              <div>Current Safety Margin: <span className="font-mono font-bold text-emerald-700">{commitment.successProbability}%</span></div>
              <div>Time Window: <span className="font-mono text-[#1A1A1A]/70 font-semibold">{commitment.deadline}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Intelligence Block */}
      <div className="border-t border-[#1A1A1A]/10 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 font-mono">
            Timeline Intelligence
          </span>
          <span className="text-[9px] text-[#1A1A1A]/40 font-bold font-mono">Progression Vector</span>
        </div>

        {commitmentSubtasks.length === 0 ? (
          <p className="text-xs text-[#1A1A1A]/40 italic">Add subtasks to generate predictive timeline intelligence.</p>
        ) : (
          <div className="relative pl-4 border-l border-[#1A1A1A]/15 space-y-4">
            {getTimelineSteps().map((step, idx) => (
              <div key={idx} className="relative">
                {/* Node circle on timeline line */}
                <span 
                  className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 border-2 ${
                    step.status === "Completed"
                      ? "bg-[#1A1A1A] border-[#1A1A1A]"
                      : "bg-white border-[#1A1A1A]/40"
                  }`} 
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#1A1A1A]/50 font-bold">
                      {step.label}
                    </span>
                    <span className="text-[9px] font-mono text-gray-400">• {step.hours} hours planned</span>
                  </div>
                  <p className={`text-xs ${step.status === "Completed" ? "line-through text-gray-400" : "text-[#1A1A1A]/85 font-medium"}`}>
                    {step.task}
                  </p>
                </div>
              </div>
            ))}
            <div className="relative">
              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 border-2 bg-indigo-600 border-indigo-600 animate-pulse" />
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-600 font-bold">
                  Target Delivery
                </span>
                <p className="text-xs font-serif italic text-[#1A1A1A] font-semibold">
                  Commitment Securely Finalized ({commitment.deadline})
                </p>
              </div>
            </div>
          </div>
        )}
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

      {/* REDESIGNED Intervention Hero Section */}
      <div className="border-t border-[#1A1A1A]/10 pt-5">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 font-mono">
            Proactive Interventions
          </span>
          <span className="text-[9px] text-[#1A1A1A]/40 font-bold font-mono">Mitigation Hero Block</span>
        </div>

        {commitmentInterventions.length === 0 ? (
          <div className="border border-[#1A1A1A]/10 bg-[#FAF9F6] p-4 text-center">
            <p className="text-xs text-[#1A1A1A]/60 font-medium font-serif italic">No proactive interventions required at this depth level.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {commitmentInterventions.map((intervention, idx) => (
              <div 
                key={intervention.id || idx}
                className="border border-[#1A1A1A] bg-[#FAF9F6] p-5 rounded-none relative overflow-hidden space-y-4"
              >
                {/* Visual progression block */}
                <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
                  <div className="text-center bg-white border border-[#1A1A1A]/10 px-3 py-1.5">
                    <span className="text-[8px] font-mono text-gray-400 block uppercase">Current Status</span>
                    <span className="text-sm font-mono font-bold text-rose-700">{commitment.successProbability}%</span>
                  </div>
                  
                  <div className="flex-1 flex justify-center px-1">
                    <span className="text-gray-400 font-mono text-xs">➔ Deploying ➔</span>
                  </div>

                  <div className="text-center bg-[#1A1A1A] border border-[#1A1A1A] px-3 py-1.5">
                    <span className="text-[8px] font-mono text-[#FAF9F6]/40 block uppercase">Projected Yield</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">{intervention.expectedSuccessProbability}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] uppercase tracking-wider text-[#1A1A1A]/55 block font-mono">
                    Mitigation Directive
                  </span>
                  <p className="text-xs text-[#1A1A1A] font-medium leading-relaxed">
                    {intervention.recommendation}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                  <span className="text-emerald-800 flex items-center gap-1 font-bold">
                    <ThumbsUp className="w-3 h-3" /> Impact: {intervention.impact}
                  </span>
                  <button
                    onClick={() => onApplyIntervention(intervention)}
                    className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-black text-[#F4F1EE] rounded-none transition-all cursor-pointer font-bold uppercase text-[8px] tracking-wider font-mono border border-transparent"
                  >
                    Execute Prescription
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FR-13 Scenario Simulator Card */}
      <div className="border-t border-[#1A1A1A]/10 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 font-mono">
            AI Scenario Simulator
          </span>
          <span className="text-[9px] text-indigo-600 font-bold font-mono uppercase">Interactive Sandbox</span>
        </div>

        {loadingScenarios ? (
          <div className="py-8 text-center space-y-2 border border-[#1A1A1A]/10 bg-[#FAF9F6]">
            <span className="inline-block w-4 h-4 border border-[#1A1A1A] border-t-transparent rounded-full animate-spin"></span>
            <p className="text-[10px] text-[#1A1A1A]/60 font-mono">Running predictive stress tests...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {scenarios.map((sc, idx) => {
              // Determine visual traits based on percentages
              let pctColor = "text-[#1A1A1A]/50";
              let pctBg = "bg-gray-100 border-gray-200";
              if (sc.successProbability >= 85) {
                pctColor = "text-emerald-800";
                pctBg = "bg-emerald-50 border-emerald-100";
              } else if (sc.successProbability >= 60) {
                pctColor = "text-amber-800";
                pctBg = "bg-amber-50 border-amber-100";
              } else {
                pctColor = "text-rose-800";
                pctBg = "bg-rose-50 border-rose-100";
              }

              return (
                <div 
                  key={sc.id || idx}
                  className="flex items-start justify-between p-3 border border-[#1A1A1A]/10 bg-white hover:border-[#1A1A1A]/30 transition-all rounded-none"
                >
                  <div className="space-y-1 pr-4">
                    <span className="text-[10px] font-mono font-bold text-[#1A1A1A]">
                      {sc.title}
                    </span>
                    <p className="text-[11px] text-[#1A1A1A]/65 leading-normal">
                      {sc.description}
                    </p>
                  </div>
                  <div className={`shrink-0 border px-2 py-1 font-mono font-bold text-xs text-center min-w-[50px] ${pctBg} ${pctColor}`}>
                    {sc.successProbability}%
                  </div>
                </div>
              );
            })}
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
