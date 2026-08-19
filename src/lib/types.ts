export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: "parent" | "sitter" | null;
  onboarded: boolean;
  phone?: string;
  location?: string;
  bio?: string;
  createdAt: string;
  gender?: "male" | "female";
}

export interface SitterProfile extends UserProfile {
  role: "sitter";
  services: string[];
  petTypes: string[];
  pricePerNight: number;
  experience: string;
  availability: string[];
  verified: boolean;
  topRated: boolean;
  responseTime: string;
  acceptanceRate: number;
  repeatClients: number;
  totalEarnings: number;
  totalBookings: number;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  notes: string;
  photoURL?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  sitterId: string;
  sitterName: string;
  parentId: string;
  parentName: string;
  petId: string;
  petName: string;
  startDate: string;
  endDate: string;
  status: "pending" | "confirmed" | "upcoming" | "completed" | "cancelled";
  totalPrice: number;
  paymentId?: string;
  paymentStatus: "pending" | "paid" | "refunded";
  notes?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  sitterId: string;
  bookingId: string;
  authorId: string;
  author: string;
  authorGender: "male" | "female";
  rating: number;
  date: string;
  text: string;
  petType: string;
  helpful: number;
  helpfulBy: string[];
  response?: string;
  responseDate?: string;
  createdAt: string;
}

export interface MonthlyInvoice {
  id: string;
  sitterId: string;
  month: string;
  year: number;
  totalEarnings: number;
  totalBookings: number;
  platformFee: number;
  netPayout: number;
  status: "paid" | "pending" | "processing";
  lineItems: InvoiceLineItem[];
  createdAt: string;
}

export interface InvoiceLineItem {
  parentName: string;
  petName: string;
  dates: string;
  amount: number;
  bookingId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string | null>;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: Record<string, number>;
  sitterId: string;
  parentId: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  author: string;
  authorRole: "parent" | "sitter";
  authorGender: "male" | "female";
  category: "tip" | "question" | "experience" | "general";
  title: string;
  text: string;
  tags: string[];
  likes: number;
  likedBy: string[];
  commentCount: number;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  author: string;
  authorGender: "male" | "female";
  text: string;
  createdAt: string;
}
