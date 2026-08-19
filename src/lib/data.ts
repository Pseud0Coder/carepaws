export interface Sitter {
  id: string;
  name: string;
  gender: "male" | "female";
  bio: string;
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  location: string;
  experience: string;
  services: string[];
  petTypes: string[];
  availability: string[];
  verified: boolean;
  topRated: boolean;
}

export interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  notes: string;
}

export interface Booking {
  id: string;
  sitterId: string;
  sitterName: string;
  petName: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "completed" | "cancelled";
  totalPrice: number;
}

export interface Review {
  id: string;
  sitterId: string;
  author: string;
  authorGender: "male" | "female";
  rating: number;
  date: string;
  text: string;
  petType: string;
  helpful: number;
  response?: string;
}

export interface MonthlyInvoice {
  id: string;
  month: string;
  year: number;
  totalEarnings: number;
  totalBookings: number;
  platformFee: number;
  netPayout: number;
  status: "paid" | "pending";
  lineItems: { parentName: string; petName: string; dates: string; amount: number }[];
}

export const sitters: Sitter[] = [
  {
    id: "1",
    name: "Priya Sharma",
    gender: "female",
    bio: "Animal lover with 8+ years of pet sitting experience in Mumbai. I treat every pet like my own family. Certified in pet first aid and CPR by IVMA.",
    rating: 4.9,
    reviewCount: 127,
    pricePerNight: 2500,
    location: "Bandra, Mumbai",
    experience: "8 years",
    services: ["Overnight stays", "Dog walking", "Pet taxi", "Medication admin"],
    petTypes: ["Dogs", "Cats", "Rabbits"],
    availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    verified: true,
    topRated: true,
  },
  {
    id: "2",
    name: "Arjun Menon",
    gender: "male",
    bio: "Work-from-home tech professional in Bangalore who loves having furry companions around. Your pet will get plenty of attention and playtime in my pet-friendly apartment.",
    rating: 4.8,
    reviewCount: 89,
    pricePerNight: 1800,
    location: "Koramangala, Bangalore",
    experience: "5 years",
    services: ["Overnight stays", "Dog walking", "Training reinforcement"],
    petTypes: ["Dogs", "Cats"],
    availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    verified: true,
    topRated: false,
  },
  {
    id: "3",
    name: "Dr. Sneha Kapoor",
    gender: "female",
    bio: "Veterinary professional turned full-time pet sitter in Delhi. I have a deep understanding of animal health and behavior. Your pets are in expert hands.",
    rating: 5.0,
    reviewCount: 203,
    pricePerNight: 3000,
    location: "Hauz Khas, Delhi",
    experience: "12 years",
    services: ["Overnight stays", "Dog walking", "Medication admin", "Special needs care", "Pet photography"],
    petTypes: ["Dogs", "Cats", "Birds", "Reptiles"],
    availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    verified: true,
    topRated: true,
  },
  {
    id: "4",
    name: "Vikram Singh",
    gender: "male",
    bio: "Retired army officer with a gentle soul in Pune. I have a large compound and two friendly Indie dogs of my own. Your pet will love it here.",
    rating: 4.7,
    reviewCount: 64,
    pricePerNight: 1500,
    location: "Koregaon Park, Pune",
    experience: "3 years",
    services: ["Overnight stays", "Dog walking", "Yard playtime"],
    petTypes: ["Dogs"],
    availability: ["Mon", "Wed", "Fri", "Sat", "Sun"],
    verified: true,
    topRated: false,
  },
  {
    id: "5",
    name: "Meera Iyer",
    gender: "female",
    bio: "Cat specialist with a calm, quiet home perfect for feline friends in Chennai. I also care for small animals. Every guest gets individualized attention.",
    rating: 4.9,
    reviewCount: 156,
    pricePerNight: 2000,
    location: "Adyar, Chennai",
    experience: "7 years",
    services: ["Overnight stays", "Cat boarding", "Small animal care", "Medication admin"],
    petTypes: ["Cats", "Rabbits", "Hamsters"],
    availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    verified: true,
    topRated: true,
  },
  {
    id: "6",
    name: "Rohan Das",
    gender: "male",
    bio: "Outdoor enthusiast in Goa who loves active adventures with dogs. Beach runs, trail hikes, and park playdates; your pup will have the time of their life.",
    rating: 4.6,
    reviewCount: 42,
    pricePerNight: 2200,
    location: "Anjuna, Goa",
    experience: "2 years",
    services: ["Overnight stays", "Adventure walks", "Dog hiking", "Park playdates"],
    petTypes: ["Dogs"],
    availability: ["Tue", "Thu", "Fri", "Sat", "Sun"],
    verified: false,
    topRated: false,
  },
];

export const reviews: Review[] = [
  {
    id: "r1",
    sitterId: "1",
    author: "Ananya Mehta",
    authorGender: "female",
    rating: 5,
    date: "2 weeks ago",
    text: "Priya was absolutely wonderful with our Labrador, Bruno. She sent daily photos and updates on WhatsApp. Bruno came home happy and well-cared for. We'll definitely book again!",
    petType: "Dog",
    helpful: 12,
  },
  {
    id: "r2",
    sitterId: "3",
    author: "Deepak Kumar",
    authorGender: "male",
    rating: 5,
    date: "1 month ago",
    text: "Dr. Sneha is a true professional. Our senior cat with diabetes needed careful medication scheduling, and she handled it perfectly. The photos she sent were adorable too.",
    petType: "Cat",
    helpful: 18,
    response: "Thank you, Deepak! Muffin was such a well-behaved gentleman. Happy to care for her anytime.",
  },
  {
    id: "r3",
    sitterId: "2",
    author: "Kavitha Lakshmi",
    authorGender: "female",
    rating: 4,
    date: "1 month ago",
    text: "Arjun was great with our two Indie dogs. They usually have separation anxiety but seemed totally at ease at his place. Only suggestion would be a slightly larger balcony.",
    petType: "Dog",
    helpful: 7,
    response: "Thanks Kavitha! I've actually added some more outdoor space since then. Hope to see Bholu and Guddi again soon!",
  },
  {
    id: "r4",
    sitterId: "5",
    author: "Tushar Hegde",
    authorGender: "male",
    rating: 5,
    date: "1 month ago",
    text: "Meera is the cat whisperer! Our shy rescue cat came out of her shell with Meera. The WhatsApp updates with photos made our trip to Ooty so much more relaxing.",
    petType: "Cat",
    helpful: 14,
  },
  {
    id: "r5",
    sitterId: "4",
    author: "Pooja Wadhwa",
    authorGender: "female",
    rating: 5,
    date: "3 months ago",
    text: "Vikram was perfect for our high-energy Golden Retriever. The big compound was a huge plus. Our dog came home exhausted from all the playing, exactly what we wanted!",
    petType: "Dog",
    helpful: 9,
  },
  {
    id: "r6",
    sitterId: "1",
    author: "Rohan Mehta",
    authorGender: "male",
    rating: 5,
    date: "2 months ago",
    text: "Second time booking Priya and she's consistently excellent. Very organized, sends updates on schedule, and our cat always seems content when we return.",
    petType: "Cat",
    helpful: 5,
  },
  {
    id: "r7",
    sitterId: "3",
    author: "Shreya Patel",
    authorGender: "female",
    rating: 5,
    date: "2 months ago",
    text: "We were nervous leaving our parrot with someone new, but Dr. Sneha's veterinary background put us completely at ease. She even noticed a subtle change in his plumage and advised us to visit the vet. Turned out to be a minor issue. Incredibly observant.",
    petType: "Bird",
    helpful: 22,
  },
  {
    id: "r8",
    sitterId: "6",
    author: "Karan Bhat",
    authorGender: "male",
    rating: 4,
    date: "3 months ago",
    text: "Rohan took our dog on a proper beach hike in Anjuna. Max came back muddy but ecstatic. Only reason for 4 stars is that pickup was about 20 minutes late, but the actual care was top-notch.",
    petType: "Dog",
    helpful: 3,
  },
  {
    id: "r9",
    sitterId: "5",
    author: "Divya Nair",
    authorGender: "female",
    rating: 5,
    date: "4 months ago",
    text: "Meera cared for our two rabbits while we traveled for a week. She sent daily photos and even trimmed their nails, which we hadn't asked for but greatly appreciated. Very thoughtful.",
    petType: "Rabbit",
    helpful: 11,
  },
];

export const userBookings: Booking[] = [
  {
    id: "b1",
    sitterId: "1",
    sitterName: "Priya Sharma",
    petName: "Luna",
    startDate: "2026-08-25",
    endDate: "2026-08-28",
    status: "upcoming",
    totalPrice: 7500,
  },
  {
    id: "b2",
    sitterId: "3",
    sitterName: "Dr. Sneha Kapoor",
    petName: "Whiskers",
    startDate: "2026-07-10",
    endDate: "2026-07-15",
    status: "completed",
    totalPrice: 15000,
  },
  {
    id: "b3",
    sitterId: "5",
    sitterName: "Meera Iyer",
    petName: "Mochi",
    startDate: "2026-06-01",
    endDate: "2026-06-03",
    status: "completed",
    totalPrice: 4000,
  },
];

export const userPets: Pet[] = [
  {
    id: "p1",
    name: "Luna",
    type: "Dog",
    breed: "Indian Pariah Dog",
    age: "3 years",
    notes: "Very friendly and playful. Loves belly rubs and fetch. Allergic to chicken.",
  },
  {
    id: "p2",
    name: "Whiskers",
    type: "Cat",
    breed: "Persian",
    age: "5 years",
    notes: "Indoor cat. Shy at first but warms up quickly. Needs medication twice daily.",
  },
  {
    id: "p3",
    name: "Mochi",
    type: "Rabbit",
    breed: "Angora",
    age: "1 year",
    notes: "Loves fresh greens and cuddles. Very gentle and quiet.",
  },
];

export const monthlyInvoices: MonthlyInvoice[] = [
  {
    id: "inv-1",
    month: "August",
    year: 2026,
    totalEarnings: 47500,
    totalBookings: 18,
    platformFee: 4750,
    netPayout: 42750,
    status: "pending",
    lineItems: [
      { parentName: "Ananya Mehta", petName: "Bruno", dates: "Aug 1-3", amount: 7500 },
      { parentName: "Karan Bhat", petName: "Max", dates: "Aug 5-7", amount: 6600 },
      { parentName: "Deepak Kumar", petName: "Muffin", dates: "Aug 8-10", amount: 7500 },
      { parentName: "Shreya Patel", petName: "Kili", dates: "Aug 12-14", amount: 9000 },
      { parentName: "Rohan Mehta", petName: "Tiger", dates: "Aug 18-20", amount: 5400 },
      { parentName: "Pooja Wadhwa", petName: "Rocky", dates: "Aug 22-25", amount: 11500 },
    ],
  },
  {
    id: "inv-2",
    month: "July",
    year: 2026,
    totalEarnings: 52000,
    totalBookings: 21,
    platformFee: 5200,
    netPayout: 46800,
    status: "paid",
    lineItems: [
      { parentName: "Ananya Mehta", petName: "Bruno", dates: "Jul 1-5", amount: 12500 },
      { parentName: "Divya Nair", petName: "Snowball", dates: "Jul 8-10", amount: 6000 },
      { parentName: "Tushar Hegde", petName: "Shadow", dates: "Jul 12-15", amount: 12000 },
      { parentName: "Kavitha Lakshmi", petName: "Bholu", dates: "Jul 18-20", amount: 5400 },
      { parentName: "Aditya Bose", petName: "Simba", dates: "Jul 22-25", amount: 9000 },
      { parentName: "Sunita Rao", petName: "Lucky", dates: "Jul 28-31", amount: 7100 },
    ],
  },
  {
    id: "inv-3",
    month: "June",
    year: 2026,
    totalEarnings: 38000,
    totalBookings: 15,
    platformFee: 3800,
    netPayout: 34200,
    status: "paid",
    lineItems: [
      { parentName: "Neha Gupta", petName: "Charlie", dates: "Jun 1-3", amount: 7500 },
      { parentName: "Rajesh Nair", petName: "Coco", dates: "Jun 5-8", amount: 10000 },
      { parentName: "Ananya Mehta", petName: "Bruno", dates: "Jun 12-14", amount: 7500 },
      { parentName: "Karan Bhat", petName: "Max", dates: "Jun 18-20", amount: 6600 },
      { parentName: "Shreya Patel", petName: "Kili", dates: "Jun 22-24", amount: 6400 },
    ],
  },
];
