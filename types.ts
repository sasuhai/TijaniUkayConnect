

export type UserStatus = 'Pending Approval' | 'Active' | 'Not Active';

export interface UserProfile {
  id: string;
  full_name: string;
  address: string;
  email: string;
  phone: string;
  status: UserStatus;
  role: 'resident' | 'admin';
  approval_date?: string;
  created_at: string;
}

export interface VisitorInvitation {
  id: string;
  resident_id: string;
  resident_name: string;
  visitor_name: string;
  visitor_phone: string;
  vehicle_plate: string;
  vehicle_type: 'car' | 'motorcycle' | 'van' | 'truck' | 'other';
  visit_date_time: string;
  reason: string;
  qr_code_value: string;
  created_at: string;
}

export interface Facility {
  id: string;
  name: string;
  description: string;
}

export interface Booking {
  id: string;
  facility_id: string;
  resident_id: string;
  resident_name: string;
  booking_date: string; // YYYY-MM-DD
  booking_slot: string; // HH:MM (e.g., "07:00")
  created_at: string;
}

export interface CommunityDocument {
  id: string;
  name: string;
  description: string;
  file_url: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  attachment_url?: string;
  created_at: string;
}

export interface Contact {
    id: string;
    name: string;
    role: string;
    phone: string;
    email?: string;
}

export interface PhotoAlbum {
    id: string;
    title: string;
    description: string;
    cover_image_url: string;
}

export interface VideoAlbum {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
}

export type IssueStatus = 'New' | 'In Progress' | 'Resolved' | 'Closed';
export type IssueCategory = 'Maintenance' | 'Security' | 'Landscaping' | 'Facilities' | 'Other';

export interface Issue {
  id: string;
  resident_id: string;
  resident_name: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  admin_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export interface IssueUpdate {
  id: string;
  issue_id: string;
  user_id: string; // can be resident or admin
  user_name: string;
  comment: string;
  created_at: string;
}

export interface Poll {
    id: string;
    question: string;
    options: { id: string; text: string; votes: number }[];
    totalVotes: number;
    userVotedOptionId?: string | null;
    endDate: string;
}