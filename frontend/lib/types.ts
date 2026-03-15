// lib/types.ts
export type UserRole = 'creator' | 'client' | 'admin';
export type AccountStatus = 'active' | 'pending_verification' | 'suspended' | 'deleted';
export type AvailabilityStatus = 'available' | 'busy' | 'unavailable';
export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  role: UserRole;
  status: AccountStatus;
  location?: string;
  languages?: string[];
  hourly_rate?: number;
  availability_status: AvailabilityStatus;
  avg_rating: number;
  total_reviews: number;
  completed_projects: number;
  profile_views: number;
  social_links?: SocialLink[];
  skills?: Skill[];
  portfolio?: PortfolioItem[];
  website?: string;
  created_at: string;
}

export interface SocialLink {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitch' | 'twitter' | 'linkedin' | 'facebook';
  url: string;
  handle?: string;
  followers_count: number;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string;
  level?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  project_url?: string;
  media_urls?: string[];
  tags?: string[];
  featured: boolean;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  requirements?: string;
  budget_min?: number;
  budget_max?: number;
  budget_fixed?: number;
  budget_type: 'fixed' | 'range' | 'negotiable';
  currency: string;
  deadline?: string;
  status: ProjectStatus;
  platforms: string[];
  skills_required: string[];
  tags: string[];
  views: number;
  applications_count: number;
  featured: boolean;
  is_saved?: boolean;
  has_applied?: boolean;
  client: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'avg_rating'>;
  category?: { id: string; name: string; slug: string; icon?: string };
  created_at: string;
}

export interface Application {
  id: string;
  project_id: string;
  creator_id: string;
  status: ApplicationStatus;
  cover_letter: string;
  proposed_rate?: number;
  proposed_timeline?: string;
  portfolio_urls?: string[];
  creator?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'avg_rating' | 'completed_projects'>;
  project?: Pick<Project, 'id' | 'title' | 'slug' | 'status'>;
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id?: string;
  project_title?: string;
  other_user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> & { last_seen_at?: string };
  last_message?: { body: string; created_at: string; sender_id: string };
  unread_count: number;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachments?: string[];
  created_at: string;
  edited_at?: string;
  sender?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  body: string;
  created_at: string;
  reviewer: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  project?: { id: string; title: string };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
