export type OrgRole = "rescue" | "vet";
/** "explorer" is someone just looking around: no profile setup, read-only until they choose a role. */
export type Role = "parent" | "sitter" | "explorer" | OrgRole;

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
  /** Public household details parents use to choose a sitter. */
  home?: SitterHome;

  // Rescue / vet listings. Unlike people, organisations publish a phone number
  // on purpose, so it lives on the public profile.
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  hours?: string;
  open24x7?: boolean;
  website?: string;

  // System-managed (Cloud Functions / admin only — rules block client writes).
  // `verified` means ID-checked for sitters and vetted by an admin for organisations.
  verified?: boolean;
  topRated?: boolean;
  rating?: number;
  reviewCount?: number;
  completedStays?: number;
  vouchCount?: number;
  /** Sitter has a police clearance certificate that an admin has checked. */
  backgroundChecked?: boolean;
}

export interface SitterHome {
  type: "apartment" | "house" | "farm";
  fencedYard: boolean;
  hasOwnPets: boolean;
  ownPets: string;
  children: boolean;
  smokeFree: boolean;
  /** Longest a pet is ever left alone, in hours. */
  maxHoursAlone: number;
}

export type SitterProfile = UserProfile & {
  role: "sitter";
  services: string[];
  petTypes: string[];
  pricePerNight: number;
};

export type OrgProfile = UserProfile & { role: OrgRole };

export const isOrgRole = (r: Role | null | undefined): r is OrgRole => r === "rescue" || r === "vet";

/** A rescue or vet clinic vouching for a sitter. Stored at vouches/{orgId}_{sitterId}. */
export interface Vouch {
  id: string;
  orgId: string;
  orgName: string;
  orgPhoto: string | null;
  orgType: OrgRole;
  sitterId: string;
  note?: string;
  createdAt?: string;
}

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

export type KycStatus = "submitted" | "approved" | "rejected";
export type KycIdType = "aadhaar" | "pan" | "passport" | "driving_licence" | "voter_id";

/**
 * A sitter's identity verification case at kyc/{uid}. Only the owner can read it, and the ID images
 * (in private Storage) can never be read by clients. Status moves past "submitted" only by an admin.
 */
export interface KycCase {
  status: KycStatus;
  legalName: string;
  dob: string;
  idType: KycIdType;
  /** Last four characters only. Full ID numbers are never collected. */
  idLast4: string;
  addressLine: string;
  city: string;
  pincode: string;
  emergencyName: string;
  emergencyPhone: string;
  hasPoliceCert: boolean;
  submittedAt?: string;
  reviewedAt?: string;
  /** Why a case was rejected; shown to the sitter so they can fix it. */
  reason?: string;
  backgroundChecked?: boolean;
  /** Set when the raw ID images were deleted after the retention window. */
  purgedAt?: string;
}
