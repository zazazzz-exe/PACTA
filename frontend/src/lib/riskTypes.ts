export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

export interface RiskSignal {
  label: string;
  detail: string;
  tone: 'positive' | 'neutral' | 'caution';
}

export interface RiskRead {
  risk_level: RiskLevel;
  headline: string;
  summary: string;
  signals: RiskSignal[];
  recommendation: string;
  suggested_milestones: number;
  suggested_first_milestone_pct: number;
}
