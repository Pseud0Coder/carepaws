"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Settings,
  PawPrint,
  ChevronRight,
  Plus,
  LogIn,
  Download,
  FileText,
  TrendingUp,
  DollarSign,
  Star,
  Loader2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/Avatar";

const tabs = ["My Pets", "Bookings", "Invoices", "Settings"];

interface PetData {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  notes: string;
}

interface BookingData {
  id: string;
  sitterId: string;
  sitterName: string;
  parentId: string;
  parentName: string;
  petName: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
}

interface InvoiceData {
  id: string;
  month: string;
  year: number;
  totalEarnings: number;
  totalBookings: number;
  platformFee: number;
  netPayout: number;
  status: string;
  lineItems: { parentName: string; petName: string; dates: string; amount: number; bookingId: string }[];
}

function PetIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Dog: "bg-warm-50 text-warm-500",
    Cat: "bg-primary-50 text-primary-500",
    Rabbit: "bg-accent-50 text-accent-500",
  };
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
        colors[type] || "bg-surface-alt text-text-tertiary"
      }`}
    >
      <PawPrint className="h-6 w-6" />
    </div>
  );
}

function generateInvoiceHTML(invoice: InvoiceData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; color: #2c2c2c; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #6b6b6b; font-size: 14px; margin-bottom: 32px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { text-align: left; padding: 8px 12px; background: #f5f4f0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6b6b; }
        td { padding: 10px 12px; border-bottom: 1px solid #e8e6e1; font-size: 14px; }
        .total-row td { border-bottom: none; font-weight: 600; border-top: 2px solid #2c2c2c; }
        .footer { margin-top: 48px; font-size: 12px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <h1>CarePaws Invoice</h1>
      <div class="subtitle">${invoice.month} ${invoice.year}</div>
      <table>
        <thead>
          <tr><th>Pet Parent</th><th>Pet</th><th>Dates</th><th style="text-align:right">Amount</th></tr>
        </thead>
        <tbody>
          ${invoice.lineItems.map(item => `
            <tr>
              <td>${item.parentName}</td>
              <td>${item.petName}</td>
              <td>${item.dates}</td>
              <td style="text-align:right">₹${item.amount.toLocaleString("en-IN")}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="3">Gross Earnings</td>
            <td style="text-align:right">₹${invoice.totalEarnings.toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td colspan="3" style="color:#6b6b6b">Platform Fee (10%)</td>
            <td style="text-align:right;color:#6b6b6b">-₹${invoice.platformFee.toLocaleString("en-IN")}</td>
          </tr>
          <tr class="total-row">
            <td colspan="3">Net Payout</td>
            <td style="text-align:right">₹${invoice.netPayout.toLocaleString("en-IN")}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">CarePaws · Trusted Pet Sitting · Generated on ${new Date().toLocaleDateString("en-IN")}</div>
    </body>
    </html>
  `;
}

function downloadInvoice(invoice: InvoiceData) {
  const html = generateInvoiceHTML(invoice);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = `carepaws-invoice-${invoice.month.toLowerCase()}-${invoice.year}.html`;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const { profile, user, loading: authLoading, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState("My Pets");
  // Real data
  const [pets, setPets] = useState<PetData[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Add pet form
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPet, setNewPet] = useState({ name: "", type: "Dog", breed: "", age: "", notes: "" });

  // Fetch real data
  useEffect(() => {
    if (!user || !profile) return;

    Promise.all([
      authFetch(`/api/pets?userId=${user.uid}`).then((r) => r.json()),
      authFetch(`/api/bookings?userId=${user.uid}`).then((r) => r.json()),
      profile.role === "sitter"
        ? authFetch(`/api/invoices?sitterId=${user.uid}`).then((r) => r.json())
        : Promise.resolve([]),
    ])
      .then(([petsData, bookingsData, invoicesData]) => {
        setPets(Array.isArray(petsData) ? petsData : []);
        const bd = bookingsData || {};
        setBookings([...(bd.parentBookings || []), ...(bd.sitterBookings || [])]);
        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [user, profile]);

  const handleAddPet = async () => {
    if (!user || !newPet.name || !newPet.breed) return;
    try {
      const res = await authFetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, ...newPet }),
      });
      const data = await res.json();
      if (data.id) {
        setPets([{ id: data.id, ownerId: user.uid, ...newPet } as PetData, ...pets]);
        setNewPet({ name: "", type: "Dog", breed: "", age: "", notes: "" });
        setShowAddPet(false);
      }
    } catch (e) {
      console.error("Failed to add pet:", e);
    }
  };

  const handleDeletePet = async (petId: string) => {
    try {
      await authFetch(`/api/pets?petId=${petId}`, { method: "DELETE" });
      setPets(pets.filter((p) => p.id !== petId));
    } catch (e) {
      console.error("Failed to delete pet:", e);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt">
          <LogIn className="h-8 w-8 text-text-tertiary" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-foreground">Sign in required</h1>
        <p className="mt-2 text-sm text-text-tertiary">
          Please sign in to access your dashboard.
        </p>
        <Link
          href="/auth"
          className="mt-6 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-primary-600"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const displayName = profile.displayName?.split(" ")[0] || "there";

  // Sitter earnings from real invoices
  const totalEarnings = invoices.reduce((sum, inv) => sum + inv.totalEarnings, 0);
  const totalBookings = invoices.reduce((sum, inv) => sum + inv.totalBookings, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Avatar name={profile.displayName} size="xl" gender={profile.gender || "female"} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-text-tertiary">
            {profile.role === "sitter"
              ? "Manage your bookings, earnings, and profile"
              : "Manage your pets, bookings, and preferences"}
          </p>
        </div>
      </div>

      {/* Sitter earnings overview */}
      {profile.role === "sitter" && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
                <DollarSign className="h-5 w-5 text-accent-500" />
              </div>
              <div>
                <div className="text-xs text-text-tertiary">Total Earnings</div>
                <div className="text-lg font-bold text-foreground">₹{totalEarnings.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <TrendingUp className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <div className="text-xs text-text-tertiary">Total Bookings</div>
                <div className="text-lg font-bold text-foreground">{totalBookings}</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warm-50">
                <Star className="h-5 w-5 text-warm-500" />
              </div>
              <div>
                <div className="text-xs text-text-tertiary">Average Rating</div>
                <div className="text-lg font-bold text-foreground">{profile.role === "sitter" ? "4.9" : "N/A"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-surface-alt p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const icon =
            tab === "My Pets"
              ? PawPrint
              : tab === "Bookings"
              ? Calendar
              : tab === "Invoices"
              ? FileText
              : Settings;
          const Icon = icon;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab}
            </button>
          );
        })}
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
        </div>
      ) : (
        <>
          {/* My Pets */}
          {activeTab === "My Pets" && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Your Pets</h2>
                <button
                  onClick={() => setShowAddPet(!showAddPet)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  Add Pet
                </button>
              </div>

              {/* Add pet form */}
              {showAddPet && (
                <div className="mt-4 rounded-xl border border-border bg-surface p-5">
                  <h3 className="font-medium text-foreground">Add a new pet</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Pet name"
                      value={newPet.name}
                      onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                      className="rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                    <select
                      value={newPet.type}
                      onChange={(e) => setNewPet({ ...newPet, type: e.target.value })}
                      className="rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-foreground focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    >
                      <option>Dog</option>
                      <option>Cat</option>
                      <option>Rabbit</option>
                      <option>Bird</option>
                      <option>Hamster</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Breed"
                      value={newPet.breed}
                      onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                      className="rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                    <input
                      type="text"
                      placeholder="Age"
                      value={newPet.age}
                      onChange={(e) => setNewPet({ ...newPet, age: e.target.value })}
                      className="rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <textarea
                    placeholder="Special notes (allergies, routines, etc.)"
                    value={newPet.notes}
                    onChange={(e) => setNewPet({ ...newPet, notes: e.target.value })}
                    rows={2}
                    className="mt-3 w-full rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleAddPet}
                      disabled={!newPet.name || !newPet.breed}
                      className="flex-1 rounded-lg bg-primary-500 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-600 disabled:opacity-30"
                    >
                      Add Pet
                    </button>
                    <button
                      onClick={() => setShowAddPet(false)}
                      className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-alt"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pets.length === 0 ? (
                  <div className="col-span-full py-12 text-center">
                    <PawPrint className="mx-auto h-10 w-10 text-text-tertiary" />
                    <p className="mt-3 text-sm text-text-tertiary">No pets added yet.</p>
                  </div>
                ) : (
                  pets.map((pet) => (
                    <div
                      key={pet.id}
                      className="rounded-xl border border-border bg-surface p-5 transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <PetIcon type={pet.type} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">{pet.name}</h3>
                          <p className="text-sm text-text-tertiary">
                            {pet.breed} · {pet.age}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePet(pet.id)}
                          className="text-text-tertiary hover:text-error transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {pet.notes && (
                        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                          {pet.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Bookings */}
          {activeTab === "Bookings" && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Your Bookings</h2>
                <Link
                  href="/sitters"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-600"
                >
                  <Plus className="h-4 w-4" />
                  New Booking
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {bookings.length === 0 ? (
                  <div className="py-12 text-center">
                    <Calendar className="mx-auto h-10 w-10 text-text-tertiary" />
                    <p className="mt-3 text-sm text-text-tertiary">No bookings yet.</p>
                    <Link
                      href="/sitters"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
                    >
                      Browse sitters to make your first booking
                    </Link>
                  </div>
                ) : (
                  bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-all hover:shadow-sm"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warm-50">
                        <Calendar className="h-5 w-5 text-warm-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {booking.sitterName}
                          </h3>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                              booking.status === "upcoming" || booking.status === "confirmed"
                                ? "bg-accent-50 text-accent-600"
                                : booking.status === "completed"
                                ? "bg-surface-alt text-text-tertiary"
                                : "bg-error-bg text-error"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-tertiary">
                          <span className="flex items-center gap-1">
                            <PawPrint className="h-3 w-3" /> {booking.petName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {booking.startDate} to{" "}
                            {booking.endDate}
                          </span>
                          <span className="font-medium text-foreground">
                            ₹{booking.totalPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-tertiary" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Invoices */}
          {activeTab === "Invoices" && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Monthly Invoices</h2>
                  <p className="mt-1 text-sm text-text-tertiary">
                    Download invoices for all completed bookings
                  </p>
                </div>
                {invoices.length > 0 && (
                  <button
                    onClick={() => invoices.forEach((inv) => downloadInvoice(inv))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-surface-alt"
                  >
                    <Download className="h-4 w-4" />
                    Download All
                  </button>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {invoices.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="mx-auto h-10 w-10 text-text-tertiary" />
                    <p className="mt-3 text-sm text-text-tertiary">No invoices yet. Invoices are generated after completed bookings.</p>
                  </div>
                ) : (
                  invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-xl border border-border bg-surface p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-alt">
                            <FileText className="h-5 w-5 text-text-tertiary" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {invoice.month} {invoice.year}
                            </div>
                            <div className="text-sm text-text-tertiary">
                              {invoice.totalBookings} bookings
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-foreground">
                              ₹{invoice.netPayout.toLocaleString("en-IN")}
                            </div>
                            <div className={`text-xs font-medium ${
                              invoice.status === "paid" ? "text-accent-500" : "text-warm-500"
                            }`}>
                              {invoice.status === "paid" ? "Paid" : "Pending"}
                            </div>
                          </div>
                          <button
                            onClick={() => downloadInvoice(invoice)}
                            className="rounded-lg border border-border p-2.5 text-text-tertiary transition-colors hover:bg-surface-alt hover:text-foreground"
                            title={`Download ${invoice.month} invoice`}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-border-subtle pt-3">
                        <div className="grid grid-cols-3 gap-2 text-xs text-text-tertiary">
                          <span>Gross Earnings</span>
                          <span>Platform Fee (10%)</span>
                          <span className="text-right">Net Payout</span>
                        </div>
                        <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
                          <span className="font-medium text-foreground">
                            ₹{invoice.totalEarnings.toLocaleString("en-IN")}
                          </span>
                          <span className="text-error">
                            -₹{invoice.platformFee.toLocaleString("en-IN")}
                          </span>
                          <span className="text-right font-semibold text-foreground">
                            ₹{invoice.netPayout.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === "Settings" && (
            <div className="mt-8 max-w-lg">
              <h2 className="text-lg font-semibold text-foreground">Account Settings</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-border bg-surface p-5">
                  <h3 className="text-sm font-medium text-foreground">Profile</h3>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs text-text-tertiary">Name</label>
                      <input
                        type="text"
                        defaultValue={profile.displayName}
                        disabled
                        className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 text-sm text-text-tertiary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-tertiary">Email</label>
                      <input
                        type="email"
                        defaultValue={profile.email}
                        disabled
                        className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 text-sm text-text-tertiary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-tertiary">Location</label>
                      <div className="mt-1 relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                        <input
                          type="text"
                          defaultValue={profile.location || ""}
                          placeholder="e.g. Bandra, Mumbai"
                          className="w-full rounded-lg border border-border bg-surface-alt py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <button className="w-full rounded-lg bg-primary-500 py-3 text-sm font-medium text-white transition-all hover:bg-primary-600">
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
