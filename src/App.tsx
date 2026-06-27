import React, { useState, useEffect } from "react";
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  User
} from "./firebase";
import { Commitment, Subtask, Intervention, RecoveryPlan, DailyAuditReport, Notification } from "./types";
import AuthScreen from "./components/AuthScreen";
import { setCachedToken } from "./services/googleCalendar";
import DashboardHeader from "./components/DashboardHeader";
import CommitmentForm from "./components/CommitmentForm";
import CommitmentCard from "./components/CommitmentCard";
import AvailabilityAgentView from "./components/AvailabilityAgentView";
import SelectedCommitmentDetail from "./components/SelectedCommitmentDetail";
import DailyAuditModal from "./components/DailyAuditModal";
import CalendarView from "./components/CalendarView";
import CriticalAlertBanner from "./components/CriticalAlertBanner";
import DailyAIBriefing from "./components/DailyAIBriefing";
import AIDecisionPipeline from "./components/AIDecisionPipeline";
import { Brain, Plus, LayoutDashboard } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Core collections data
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // UI state
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState<number>(-1);
  const [agentPipelineStatuses, setAgentPipelineStatuses] = useState<string[]>(["Pending", "Pending", "Pending", "Pending", "Pending", "Pending"]);
  const [auditReport, setAuditReport] = useState<DailyAuditReport | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("grid");

  // Authentication observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setCachedToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore collections once authenticated
  useEffect(() => {
    if (!user) {
      setCommitments([]);
      setSubtasks([]);
      setInterventions([]);
      setNotifications([]);
      setSelectedCommitmentId(null);
      return;
    }

    // Subscribe to Commitments
    const qCommitments = query(
      collection(db, "commitments"),
      where("userId", "==", user.uid)
    );
    const unsubscribeCommitments = onSnapshot(qCommitments, (snapshot) => {
      const list: Commitment[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Commitment);
      });
      // Sort by priority (High -> Medium -> Low) and date
      list.sort((a, b) => {
        const priorityVal = { High: 3, Medium: 2, Low: 1 };
        if (priorityVal[a.priority] !== priorityVal[b.priority]) {
          return priorityVal[b.priority] - priorityVal[a.priority];
        }
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
      setCommitments(list);

      // Default select the first commitment if none is selected
      if (list.length > 0 && !selectedCommitmentId) {
        setSelectedCommitmentId(list[0].id);
      }
    });

    // Subscribe to Subtasks
    const qSubtasks = collection(db, "subtasks");
    const unsubscribeSubtasks = onSnapshot(qSubtasks, (snapshot) => {
      const list: Subtask[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Subtask);
      });
      setSubtasks(list);
    });

    // Subscribe to Interventions
    const qInterventions = collection(db, "interventions");
    const unsubscribeInterventions = onSnapshot(qInterventions, (snapshot) => {
      const list: Intervention[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Intervention);
      });
      setInterventions(list);
    });

    // Subscribe to Notifications
    const qNotifications = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      const list: Notification[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Notification);
      });
      // Sort by newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);
    });

    return () => {
      unsubscribeCommitments();
      unsubscribeSubtasks();
      unsubscribeInterventions();
      unsubscribeNotifications();
    };
  }, [user]);

  // Handle notification read triggers
  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      const promises = unread.map(n => n.id && updateDoc(doc(db, "notifications", n.id), { read: true }));
      await Promise.all(promises);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      const promises = notifications.map(n => n.id && deleteDoc(doc(db, "notifications", n.id)));
      await Promise.all(promises);
    } catch (err) {
      console.error("Error clearing all notifications:", err);
    }
  };

  const handleQuickAddForDate = async (dateStr: string) => {
    const title = window.prompt(`Submit brief work order due on ${dateStr}:`, "Deliver project milestone");
    if (!title || !title.trim()) return;
    
    // Auto assemble the natural language prompt
    const nlpStr = `${title.trim()} due on ${dateStr}`;
    await handleAddCommitment(nlpStr);
  };

  // Check for upcoming deadlines and auto-trigger notifications
  useEffect(() => {
    if (!user || commitments.length === 0) return;

    const runDeadlineChecks = async () => {
      const now = new Date();
      for (const commitment of commitments) {
        if (commitment.status === "Completed") continue;
        
        const deadline = new Date(commitment.deadline);
        const diffTime = deadline.getTime() - now.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        // Under 2 days (48 hours)
        if (diffDays > 0 && diffDays <= 2) {
          const notificationTitle = `Deadline Approaching: ${commitment.title}`;
          const alreadyNotified = notifications.some(
            (n) => n.title === notificationTitle && n.userId === user.uid
          );

          if (!alreadyNotified) {
            await addDoc(collection(db, "notifications"), {
              userId: user.uid,
              title: notificationTitle,
              message: `The obligation "${commitment.title}" is due on ${commitment.deadline} (less than 48 hours). Risk score: ${commitment.riskScore}%.`,
              type: "warning",
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        }

        // Overdue commitments
        if (diffDays <= 0) {
          const notificationTitle = `OVERDUE: ${commitment.title}`;
          const alreadyNotified = notifications.some(
            (n) => n.title === notificationTitle && n.userId === user.uid
          );

          if (!alreadyNotified) {
            await addDoc(collection(db, "notifications"), {
              userId: user.uid,
              title: notificationTitle,
              message: `The obligation "${commitment.title}" has passed its deadline of ${commitment.deadline}. Please take mitigation action immediately!`,
              type: "risk",
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    };

    const timeoutId = setTimeout(() => {
      runDeadlineChecks();
    }, 2050);

    return () => clearTimeout(timeoutId);
  }, [commitments, notifications, user]);

  // Selected commitment helper
  const selectedCommitment = commitments.find(c => c.id === selectedCommitmentId) || null;

  // FR-2: Add Commitment from Plain English
  const handleAddCommitment = async (nlpText: string) => {
    if (!user) return;
    setIsParsing(true);
    
    try {
      const currentDate = new Date().toISOString().split("T")[0];

      // 1. Call parse API
      const parseResponse = await fetch("/api/commitments/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nlpText, currentDate })
      });
      const parsed = await parseResponse.json();

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      // 2. Insert draft commitment into Firestore
      const commitmentRef = await addDoc(collection(db, "commitments"), {
        userId: user.uid,
        title: parsed.title,
        deadline: parsed.deadline,
        priority: parsed.priority || "Medium",
        riskScore: 30, // Default placeholders till risk agent runs
        successProbability: 70,
        riskLevel: "Medium",
        explanation: "Calculating commitment parameters...",
        status: "Active",
        createdAt: new Date().toISOString()
      });

      const commitmentId = commitmentRef.id;
      setSelectedCommitmentId(commitmentId);

      // 3. Call decompose API to generate subtasks
      const decomposeResponse = await fetch("/api/commitments/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: parsed.title, 
          deadline: parsed.deadline, 
          priority: parsed.priority 
        })
      });
      const subtasksList: Omit<Subtask, "id">[] = await decomposeResponse.json();

      // Write subtasks to Firestore
      const subtaskWritePromises = subtasksList.map(subtask => 
        addDoc(collection(db, "subtasks"), {
          ...subtask,
          commitmentId
        })
      );
      await Promise.all(subtaskWritePromises);

      // 4. Call analyze-risk API (including concurrent workload)
      const otherCommitments = commitments.filter(c => c.status === "Active");
      const analyzeResponse = await fetch("/api/commitments/analyze-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitment: {
            title: parsed.title,
            deadline: parsed.deadline,
            priority: parsed.priority,
            subtasks: subtasksList
          },
          allCommitments: otherCommitments,
          currentDate
        })
      });
      const riskData = await analyzeResponse.json();

      // Update commitment with computed risk details
      await updateDoc(doc(db, "commitments", commitmentId), {
        riskScore: riskData.riskScore,
        successProbability: riskData.successProbability,
        riskLevel: riskData.riskLevel,
        explanation: riskData.explanation
      });

      // Write interventions to Firestore
      const interventionWritePromises = (riskData.interventions || []).map((intervention: any) => 
        addDoc(collection(db, "interventions"), {
          commitmentId,
          recommendation: intervention.recommendation,
          impact: intervention.impact,
          expectedSuccessProbability: intervention.expectedSuccessProbability
        })
      );
      await Promise.all(interventionWritePromises);

      // Write a notification about successfully adding and parsing the commitment
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        title: "Obligation Decomposed",
        message: `Successfully parsed and scheduled "${parsed.title}" due on ${parsed.deadline}. Milestones and risk scores compiled.`,
        type: "success",
        read: false,
        createdAt: new Date().toISOString()
      });

    } catch (err: any) {
      console.error("Error adding commitment:", err);
      throw new Error(err.message || "Parsing agent encountered an error.");
    } finally {
      setIsParsing(false);
    }
  };

  // Delete commitment
  const handleDeleteCommitment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this commitment? This will also delete all subtasks and interventions.")) return;

    try {
      await deleteDoc(doc(db, "commitments", id));
      
      // Delete associated subtasks and interventions in background
      const associatedSubtasks = subtasks.filter(s => s.commitmentId === id);
      const subtaskDeletes = associatedSubtasks.map(s => s.id && deleteDoc(doc(db, "subtasks", s.id)));
      
      const associatedInterventions = interventions.filter(i => i.commitmentId === id);
      const interventionDeletes = associatedInterventions.map(i => i.id && deleteDoc(doc(db, "interventions", i.id)));
      
      await Promise.all([...subtaskDeletes, ...interventionDeletes]);

      if (selectedCommitmentId === id) {
        setSelectedCommitmentId(null);
      }
    } catch (err) {
      console.error("Error deleting commitment:", err);
    }
  };

  // Toggle status of a commitment (Active / Completed)
  const handleToggleComplete = async (commitment: Commitment, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = commitment.status === "Completed" ? "Active" : "Completed";
    
    try {
      await updateDoc(doc(db, "commitments", commitment.id), {
        status: newStatus,
        // Reset risk score if completed to prevent workload pollution
        riskScore: newStatus === "Completed" ? 0 : 30,
        successProbability: newStatus === "Completed" ? 100 : 70,
        riskLevel: newStatus === "Completed" ? "Low" : "Medium"
      });
    } catch (err) {
      console.error("Error completing commitment:", err);
    }
  };

  // Toggle subtask status (Pending / Completed)
  const handleToggleSubtask = async (subtask: Subtask) => {
    if (!subtask.id) return;
    const newStatus = subtask.status === "Completed" ? "Pending" : "Completed";

    try {
      await updateDoc(doc(db, "subtasks", subtask.id), {
        status: newStatus
      });

      // Recalculate success probability dynamically based on checking off subtasks!
      const siblingSubtasks = subtasks.filter(s => s.commitmentId === subtask.commitmentId);
      const currentCommitment = commitments.find(c => c.id === subtask.commitmentId);
      
      if (currentCommitment) {
        const completedCount = siblingSubtasks.filter(s => s.id === subtask.id ? newStatus === "Completed" : s.status === "Completed").length;
        const totalCount = siblingSubtasks.length;
        
        if (totalCount > 0) {
          // Boost success probability proportionally as subtasks are finished!
          const ratio = completedCount / totalCount;
          const baselineProb = 60; // minimum baseline
          const successProbability = Math.round(baselineProb + (100 - baselineProb) * ratio);
          const riskScore = 100 - successProbability;
          
          let riskLevel: "Low" | "Medium" | "High" | "Critical" = "Low";
          if (successProbability < 40) riskLevel = "Critical";
          else if (successProbability < 60) riskLevel = "High";
          else if (successProbability < 80) riskLevel = "Medium";

          await updateDoc(doc(db, "commitments", subtask.commitmentId), {
            successProbability,
            riskScore,
            riskLevel
          });
        }
      }
    } catch (err) {
      console.error("Error toggling subtask:", err);
    }
  };

  // Apply Intervention Action
  const handleApplyIntervention = async (intervention: Intervention) => {
    try {
      const commitmentId = intervention.commitmentId;
      const currentCommitment = commitments.find(c => c.id === commitmentId);
      if (!currentCommitment) return;

      // Apply the success rate boost
      const successProbability = Math.min(100, intervention.expectedSuccessProbability);
      const riskScore = 100 - successProbability;
      
      let riskLevel: "Low" | "Medium" | "High" | "Critical" = "Low";
      if (successProbability < 40) riskLevel = "Critical";
      else if (successProbability < 60) riskLevel = "High";
      else if (successProbability < 80) riskLevel = "Medium";

      await updateDoc(doc(db, "commitments", commitmentId), {
        successProbability,
        riskScore,
        riskLevel,
        explanation: `Applied Intervention Action: "${intervention.recommendation}". Feasibility parameters successfully enhanced.`
      });

      // Write a notification
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        title: "Intervention Deployed",
        message: `Mitigation action applied to "${currentCommitment.title}": Probability of success boosted to ${successProbability}%.`,
        type: "success",
        read: false,
        createdAt: new Date().toISOString()
      });

      // Remove the applied intervention from Firestore so it doesn't clutter
      if (intervention.id) {
        await deleteDoc(doc(db, "interventions", intervention.id));
      }
    } catch (err) {
      console.error("Error applying intervention:", err);
    }
  };

  // Generate Recovery Plan (FR-10)
  const handleGenerateRecoveryPlan = async (commitment: Commitment): Promise<RecoveryPlan> => {
    const commitmentSubtasks = subtasks.filter(s => s.commitmentId === commitment.id);
    const currentDate = new Date().toISOString().split("T")[0];

    const response = await fetch("/api/commitments/recovery-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commitment: {
          ...commitment,
          subtasks: commitmentSubtasks
        },
        currentDate
      })
    });
    return response.json();
  };

  // Generate Negotiation Draft (FR-11)
  const handleGenerateNegotiationDraft = async (commitment: Commitment, type: string, reason: string): Promise<string> => {
    const response = await fetch("/api/commitments/negotiation-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commitment, type, reason })
    });
    const result = await response.json();
    return result.draft;
  };

  // Trigger Daily Commitment Audit (FR-12)
  const handleTriggerAudit = async () => {
    setIsAuditing(true);
    setIsAuditOpen(true);
    setAuditReport(null);
    setActiveAgentIndex(0);
    setAgentPipelineStatuses(["Pending", "Pending", "Pending", "Pending", "Pending", "Pending"]);

    const pipelineStages = [
      "Planner Agent",
      "Decomposition Agent",
      "Availability Agent",
      "Intervention Agent",
      "Negotiation Agent",
      "Daily Audit Compiler"
    ];

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    
    try {
      // Step through each agent sequentially
      for (let i = 0; i < pipelineStages.length; i++) {
        setActiveAgentIndex(i);
        setAgentPipelineStatuses(prev => {
          const next = [...prev];
          next[i] = "Running";
          return next;
        });
        
        await delay(900);

        setAgentPipelineStatuses(prev => {
          const next = [...prev];
          next[i] = "Completed";
          return next;
        });
      }

      const activeList = commitments.map(c => ({
        title: c.title,
        deadline: c.deadline,
        priority: c.priority,
        riskLevel: c.riskLevel,
        successProbability: c.successProbability,
        subtasks: subtasks.filter(s => s.commitmentId === c.id).map(s => s.title)
      }));

      const currentDate = new Date().toISOString().split("T")[0];

      const response = await fetch("/api/commitments/daily-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitments: activeList, currentDate })
      });
      const data = await response.json();
      setAuditReport(data);

      // Write an audit compilation notification
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        title: "Daily Audit Compiled",
        message: `Intelligence platform successfully generated health score of ${data.healthScore}%. Evaluated ${activeList.length} commitments.`,
        type: "info",
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error running audit:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EE]">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-[#1A1A1A]/60 font-mono uppercase tracking-widest">Synchronizing secure session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  const activeCommitments = commitments.filter(c => c.status === "Active");
  const completedCommitments = commitments.filter(c => c.status === "Completed");

  return (
    <div className="min-h-screen bg-[#F4F1EE] p-4 md:p-6 lg:p-8 font-sans antialiased text-[#1A1A1A]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Critical Alert Banner for High/Critical Risks */}
        <CriticalAlertBanner 
          commitments={commitments} 
          subtasks={subtasks} 
          onSelectCommitment={(id) => setSelectedCommitmentId(id)} 
        />

        {/* Header Block */}
        <DashboardHeader 
          commitments={commitments}
          onTriggerAudit={handleTriggerAudit}
          isAuditing={isAuditing}
          onSignOut={() => setUser(null)}
          userName={user.email?.split("@")[0]}
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDeleteNotification={handleDeleteNotification}
          onClearAll={handleClearAllNotifications}
        />

        {/* NLP Creation Panel */}
        <CommitmentForm 
          onAddCommitment={handleAddCommitment}
          isParsing={isParsing}
        />

        {/* Main Workspace Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left/Middle Column (Commitments List & Availability) - 7 cols */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Daily AI Briefing */}
            <DailyAIBriefing commitments={commitments} subtasks={subtasks} />

            {/* Active Commitments List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]/10">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 opacity-60" />
                  <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1A1A1A]/70 font-mono">
                    Active Obligations Ledger ({activeCommitments.length})
                  </span>
                </div>
                {/* Tab Switcher */}
                <div className="flex border border-[#1A1A1A]/10 p-0.5 bg-white/45">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-1 font-mono text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-[#1A1A1A] text-white font-black"
                        : "text-[#1A1A1A]/50 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5"
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode("calendar")}
                    className={`px-3 py-1 font-mono text-[9px] font-bold uppercase transition-all cursor-pointer ${
                      viewMode === "calendar"
                        ? "bg-[#1A1A1A] text-white font-black"
                        : "text-[#1A1A1A]/50 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5"
                    }`}
                  >
                    Calendar
                  </button>
                </div>
              </div>

              {viewMode === "calendar" ? (
                <CalendarView
                  commitments={commitments}
                  selectedCommitmentId={selectedCommitmentId}
                  onSelectCommitment={setSelectedCommitmentId}
                  onQuickAddForDate={handleQuickAddForDate}
                />
              ) : activeCommitments.length === 0 ? (
                <div className="border border-dashed border-[#1A1A1A]/20 p-10 text-center space-y-4 bg-transparent rounded-none">
                  <div className="w-10 h-10 border border-[#1A1A1A]/20 flex items-center justify-center mx-auto text-[#1A1A1A]/40 bg-white/50">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-serif italic text-[#1A1A1A] font-medium">No active obligations recorded</h3>
                    <p className="text-xs text-[#1A1A1A]/50 mt-1.5 max-w-sm mx-auto leading-relaxed">
                      Utilize the plain text ingestion ledger at the top of the screen to submit dynamic work orders or commitments.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {activeCommitments.map(commitment => (
                    <CommitmentCard
                      key={commitment.id}
                      commitment={commitment}
                      subtasks={subtasks.filter(s => s.commitmentId === commitment.id)}
                      onSelect={(c) => setSelectedCommitmentId(c.id)}
                      onDelete={handleDeleteCommitment}
                      onToggleComplete={handleToggleComplete}
                      isSelected={selectedCommitmentId === commitment.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Availability Agent Panel */}
            <AvailabilityAgentView 
              commitments={commitments}
              subtasks={subtasks}
            />

            {/* Completed commitments toggled view */}
            {completedCommitments.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]/10">
                  <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1A1A1A]/50 font-mono block">
                    Completed & Archived Registers ({completedCommitments.length})
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 opacity-75 hover:opacity-100 transition-opacity">
                  {completedCommitments.map(commitment => (
                    <CommitmentCard
                      key={commitment.id}
                      commitment={commitment}
                      subtasks={subtasks.filter(s => s.commitmentId === commitment.id)}
                      onSelect={(c) => setSelectedCommitmentId(c.id)}
                      onDelete={handleDeleteCommitment}
                      onToggleComplete={handleToggleComplete}
                      isSelected={selectedCommitmentId === commitment.id}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column (Agent Cockpit: Subtasks, Risk, Recovery, Negotiation) - 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            {selectedCommitment ? (
              <SelectedCommitmentDetail
                commitment={selectedCommitment}
                subtasks={subtasks}
                interventions={interventions}
                onToggleSubtask={handleToggleSubtask}
                onApplyIntervention={handleApplyIntervention}
                onGenerateRecoveryPlan={handleGenerateRecoveryPlan}
                onGenerateNegotiationDraft={handleGenerateNegotiationDraft}
              />
            ) : (
              <div className="border border-[#1A1A1A]/10 bg-white p-8 text-center space-y-4 py-16 rounded-none">
                <Brain className="w-10 h-10 text-[#1A1A1A]/30 mx-auto" />
                <div>
                  <h3 className="text-sm font-serif italic text-[#1A1A1A] font-medium">No Record Selected</h3>
                  <p className="text-xs text-[#1A1A1A]/50 mt-1 max-w-[240px] mx-auto leading-relaxed">
                    Select an active obligation card from the ledger list to initialize advanced risk & recovery metrics.
                  </p>
                </div>
              </div>
            )}

            {/* Persistent AI Agent Pipeline */}
            <AIDecisionPipeline isAuditing={isAuditing} activeAgentIndex={activeAgentIndex} />
          </div>

        </div>

      </div>

      {/* Daily Audit Modal */}
      <DailyAuditModal
        report={auditReport}
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

    </div>
  );
}
