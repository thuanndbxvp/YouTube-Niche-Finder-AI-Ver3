// Fix: Define the types used throughout the application.
export interface Part {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Part[];
}

interface BilingualText {
  original: string;
  translated: string;
}

interface AnalysisMetrics {
  interest_level: {
    score: number;
    explanation: string;
  };
  monetization_potential: {
    score: number;
    rpm_estimate: string;
    explanation:string;
  };
  competition_level: {
    score: number;
    explanation: string;
  };
  sustainability: {
    score: number;
    explanation: string;
  };
}

export interface VideoIdea {
    title: BilingualText;
    draft_content: string;
}

export interface Niche {
  niche_name: BilingualText;
  description: string;
  audience_demographics: string;
  analysis: AnalysisMetrics;
  content_strategy: string;
  video_ideas?: VideoIdea[];
  channel_plan_content?: string;
}

export interface AnalysisResult {
  niches: Niche[];
}

export type FilterLevel = 'all' | 'low' | 'medium' | 'high';

export interface DetailedVideoContent {
  title: BilingualText;
  hook: string; 
  main_points: string[]; 
  call_to_action: string; 
  visual_suggestions: string; 
}

export interface ContentPlanResult {
  content_ideas: DetailedVideoContent[];
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}