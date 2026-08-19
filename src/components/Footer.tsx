import Link from "next/link";
import { PawPrint } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-semibold text-foreground"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500">
                <PawPrint className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg tracking-tight">CarePaws</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-text-tertiary">
              Trusted pet care, made simple. Connect with verified sitters who
              truly love animals.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              For Pet Parents
            </h4>
            <ul className="space-y-3 text-sm text-text-tertiary">
              <li>
                <Link href="/sitters" className="hover:text-foreground transition-colors">
                  Find a Sitter
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-foreground transition-colors">
                  Community
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              For Sitters
            </h4>
            <ul className="space-y-3 text-sm text-text-tertiary">
              <li>
                <Link href="/auth" className="hover:text-foreground transition-colors">
                  Become a Sitter
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Sitter Resources
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Insurance Info
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Support
            </h4>
            <ul className="space-y-3 text-sm text-text-tertiary">
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Safety
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-text-tertiary md:flex-row">
          <p>2026 CarePaws. All rights reserved.</p>
          <p>Built for pets, by pet lovers.</p>
        </div>
      </div>
    </footer>
  );
}
