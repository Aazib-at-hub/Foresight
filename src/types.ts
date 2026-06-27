export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Commitment {
  id: string;
  userId: string;
  title: string;
  deadline: string;
  priority: "High" | "Medium" | "Low";
  riskScore: number; // 0-100
  successProbability: number; // 0-100
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  explanation: string;
  status: "Active" | "Completed";
  createdAt: string;
}

export interface Subtask {
  id?: string;
  commitmentId: string;
  title: string;
  status: "Pending" | "Completed";
  estimatedHours: number;
}

export interface Intervention {
  id?: string;
  commitmentId: string;
  recommendation: string;
  impact: string;
  expectedSuccessProbability: number;
}

export interface RecoveryPlan {
  scheduleRebuilding: string[];
  scopeOptimization: string[];
  prioritizedSteps: string[];
}

export interface DailyAuditReport {
  healthScore: number;
  summary: string;
  riskHighlights: string[];
  urgentActions: string[];
}

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: "warning" | "info" | "success" | "risk";
  read: boolean;
  createdAt: string;
}

