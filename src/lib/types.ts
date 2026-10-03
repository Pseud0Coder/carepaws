export type Role = "parent" | "sitter";

/** Public profile at users/{uid}. Contact details live in users/{uid}/private/contact. */
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  role: Role | null;
  onboarded: boolean;
  location?: string;
  bio?: string;
  createdAt?: string;

  // Sitter-only, editable by the sitter
  services?: string[];
  petTypes?: string[];
  pricePerNight?: number;
  experience?: string;
  availability?: string[];
  responseTime?: string;

  // System-managed (Cloud Functions / admin only — rules block client writes)
  verified?: boolean;
  topRated?: boolean;
  rating?: number;
  reviewCount?: number;
  completedStays?: number;
}

export type SitterProfile = UserProfile & {
  role: "sitter";
  services: string[];
  petTypes: string[];
  pricePerNight: number;
};

export interface PrivateContact {
  email: string;
  phone?: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  notes: string;
  createdAt?: string;
}

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled" | "completed";
export type PaymentStatus = "pending" | "paid";

export interface Booking {
  id: string;
  sitterId: string;
  sitterName: string;
  sitterPhoto: string | null;
  parentId: string;
  parentName: string;
  parentPhoto: string | null;
  petId: string;
  petName: string;
  petType: string;
  petNotes: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD, check-out day */
  endDate: string;
  nights: number;
  pricePerNight: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  paymentId?: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Stored at reviews/{bookingId} so a stay can be reviewed only once. */
export interface Review {
  id: string;
  sitterId: string;
  bookingId: string;
  authorId: string;
  author: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  petType: string;
  helpfulBy: string[];
  response?: string;
  responseAt?: string;
  createdAt?: string;
}

/** Stored at conversations/{parentId}_{sitterId}. */
export interface Conversation {
  id: string;
  parentId: string;
  sitterId: string;
  participants: string[];
  names: Record<string, string>;
  photos: Record<string, string | null>;
  lastMessage: string;
  lastSenderId: string;
  lastMessageAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt?: string;
}

export type PostCategory = "tip" | "question" | "story";

export interface CommunityPost {
  id: string;
  authorId: string;
  author: string;
  authorPhoto: string | null;
  authorRole: Role;
  category: PostCategory;
  title: string;
  text: string;
  likedBy: string[];
  commentCount: number;
  createdAt?: string;
}

export interface CommunityComment {
  id: string;
  authorId: string;
  author: string;
  authorPhoto: string | null;
  text: string;
  createdAt?: string;
}
