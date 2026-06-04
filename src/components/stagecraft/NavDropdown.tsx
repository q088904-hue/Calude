"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NavItem = { label: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Practice",
    items: [
      { label: "Quickfire", href: "/stagecraft/quickfire" },
      { label: "Drill", href: "/stagecraft/drill" },
      { label: "STAR", href: "/stagecraft/star" },
      { label: "Negotiate", href: "/stagecraft/negotiate" },
      { label: "Intro", href: "/stagecraft/intro" },
      { label: "Debrief", href: "/stagecraft/debrief" },
      { label: "Recruiter", href: "/stagecraft/recruiter" },
    ],
  },
  {
    label: "Prep",
    items: [
      { label: "Companies", href: "/stagecraft/companies" },
      { label: "90-Day Plan", href: "/stagecraft/plan" },
      { label: "Portfolio", href: "/stagecraft/portfolio" },
      { label: "Checklist", href: "/stagecraft/checklist" },
    ],
  },
  {
    label: "Progress",
    items: [
      { label: "History", href: "/stagecraft/history" },
      { label: "Patterns", href: "/stagecraft/patterns" },
      { label: "Memorize", href: "/stagecraft/memorize" },
    ],
  },
];

const GROUP_BUTTON_CLASS =
  "rounded border border-sc-border bg-sc-surface px-3 py-2 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors min-h-[36px] inline-flex items-center gap-1";

function DropdownGroup({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click or Escape; return focus to the trigger on Escape.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={GROUP_BUTTON_CLASS}
      >
        {group.label}
        <svg
          viewBox="0 0 10 6"
          className={`w-2 h-2 fill-current transition-transform duration-150 ease-sc ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M0 0l5 6 5-6H0z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={group.label}
          className="absolute left-0 top-full mt-1 z-50 min-w-[150px] rounded-sc border border-sc-border bg-sc-surface shadow-sc-md py-1"
        >
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs font-mono text-sc-muted hover:text-sc-gold hover:bg-sc-gold-bg transition-colors min-h-[36px] flex items-center"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavDropdown() {
  return (
    <nav
      aria-label="Stagecraft sections"
      className="flex flex-wrap items-center gap-2"
    >
      {NAV_GROUPS.map((group) => (
        <DropdownGroup key={group.label} group={group} />
      ))}
      <Link
        href="/stagecraft/profile"
        className="rounded border border-sc-border bg-sc-surface px-3 py-2 text-xs font-mono text-sc-muted hover:border-sc-gold-dim hover:text-sc-gold transition-colors min-h-[36px] inline-flex items-center"
      >
        Profile
      </Link>
    </nav>
  );
}
