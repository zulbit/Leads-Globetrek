export type ProjectTag = 'Dreamstay' | 'Globetrek' | 'General';

export type LeadSource = 
  | 'Apify Cloud'
  | 'Google Maps'
  | 'Google Business'
  | 'LinkedIn Profile'
  | 'PakBiz Directory'
  | 'YellowPages PK'
  | 'Facebook Page'
  | 'Instagram Bio'
  | 'TikTok Account'
  | 'CSV Import';

export type OutreachStatus = 
  | 'New'
  | 'Contacted'
  | 'WhatsApp Sent'
  | 'WhatsApp Failed'
  | 'Email Sent'
  | 'Qualified'
  | 'Converted'
  | 'Unresponsive';

export type WebsiteStatus = 'Active (200 OK)' | 'Reachable (status unverified)' | 'Facebook Page Only' | 'Instagram Bio Only' | 'TikTok Profile Only' | 'No Website' | 'Broken (404 Error)';

export interface Lead {
  id: string;
  title: string;
  contactPerson?: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  websiteStatus?: WebsiteStatus;
  address: string;
  city: string;
  country: string;
  category: string;
  rating?: number;
  reviewsCount?: number;
  source: LeadSource;
  projectTag: ProjectTag;
  outreachStatus: OutreachStatus;
  notes?: string;
  createdAt: string;
  lastContactedAt?: string;
  followUpDate?: string;
  followUpNotes?: string;
  groupTag?: string;
  tags?: string[];
  trustpilotScore?: number;
  trustpilotReviews?: number;
  trustpilotStatus?: 'Verified Profile' | 'No Trustpilot' | 'Unclaimed Profile';
  trustpilotUrl?: string;
  apifyRunId?: string;
  linkedinUrl?: string;
}

export interface ApifyConfig {
  apiToken: string;
  displayName: string;
  actorId: string;
  maxItems: number;
  autoSyncToCloud: boolean;
}

export interface WhatsAppConfig {
  serverUrl: string;
  apiToken: string;
  instanceId: string;
  autoFormatPkNumbers: boolean;
  templates: WhatsAppTemplate[];
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  projectTag: ProjectTag;
  content: string;
}

export interface ScraperJob {
  id: string;
  name: string;
  platform: LeadSource;
  query: string;
  city: string;
  targetCount: number;
  leadsFound: number;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  projectTag: ProjectTag;
  category: string;
  targetCity: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  autoOutreach: boolean;
  templateId?: string;
  createdDate: string;
  completedDate?: string;
}

export interface AnalyticsData {
  totalLeads: number;
  dreamstayLeads: number;
  globetrekLeads: number;
  whatsappSent: number;
  whatsappDelivered: number;
  emailSent: number;
  conversionRate: number;
  cityBreakdown: { city: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  monthlyTrend: { month: string; leads: number; outreach: number }[];
}
