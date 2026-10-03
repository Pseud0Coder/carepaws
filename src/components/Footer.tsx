import { PawPrint } from "lucide-react";

/** Quiet sign-off at the bottom of the You screen. */
export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-1 px-5 pt-10 pb-4 text-center text-xs text-stone">
      <PawPrint className="h-4 w-4" />
      <p>CarePaws {process.env.NEXT_PUBLIC_APP_VERSION ? `v${process.env.NEXT_PUBLIC_APP_VERSION}` : ""}</p>
      <p>Made with care for the pets we love.</p>
    </footer>
  );
}
