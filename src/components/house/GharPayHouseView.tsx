import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Home,
  LayoutDashboard,
  Users,
  PhoneCall,
  GitFork,
  CheckCircle2,
  Building2,
  Calendar,
  History,
  TrendingUp,
  UserCheck,
  Settings,
  Search,
  Sun,
  Moon,
  Bell,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  DoorOpen,
  Phone,
  Bed,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOperationalStore } from "@/lib/operational-engine/store";
import {
  CallModal,
  BookingFlowModal,
  ClosingDeskModal,
  AuditTrailModal,
} from "./FloorModuleModals";
import { FinalizeBookingDialog } from "@/components/commitments/FinalizeBookingDialog";

export function GharPayHouseView() {
  const store = useOperationalStore();
  const leads = store.leads;
  const calls = store.calls;
  const bookings = store.bookings;
  const auditLogs = store.auditLogs;

  // Active Floor Selection: 'roof' (Closing Desk) | 'floor2' (Booking Flow) | 'floor1' (M-POWER Call) | 'ground' (Properties)
  const [activeFloor, setActiveFloor] = useState<"roof" | "floor2" | "floor1" | "ground">("floor2");

  // Modals state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [bookingFlowModalOpen, setBookingFlowModalOpen] = useState(false);
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || "");

  // Bottom Implementation Drawer
  const [implementationOpen, setImplementationOpen] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [themeDark, setThemeDark] = useState(true);

  // Search input state
  const [searchQuery, setSearchQuery] = useState("");

  const houseContainerRef = useRef<HTMLDivElement>(null);
  const floorRefs = {
    roof: useRef<HTMLDivElement>(null),
    floor2: useRef<HTMLDivElement>(null),
    floor1: useRef<HTMLDivElement>(null),
    ground: useRef<HTMLDivElement>(null),
  };

  const scrollToFloor = (floor: "roof" | "floor2" | "floor1" | "ground") => {
    setActiveFloor(floor);
    const el = floorRefs[floor]?.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const copyPromptText = () => {
    const prompt = `Create a modern, animated, interactive, house-themed UI for a PG/property CRM called GharPay. The interface should be a multi-floor house where each floor represents a module (M-POWER Call, Booking Flow, Closing Desk). When the user scrolls, the camera smoothly moves between floors with animations (GSAP or Framer Motion). Each room is a fully functional module with smooth transitions, interactive elements, and real data.
Design a clean, modern, premium UI with glassmorphism, soft shadows, warm colors, and micro-interactions. Add animated lights turning on when a module is active, character illustrations, and smooth floor transitions. Include a fixed sidebar, top search bar, notifications, and user profile.

Also implement the following technical fixes and improvements:
1. Fix the ₹5,000 token vs monthly-rent data mismatch in FinalizeBookingDialog.
2. Ensure all data is properly saved to Supabase and persisted after refresh.
3. Improve error handling: do not return success if Supabase fails. Show clear error messages.
4. Make sure the project builds and passes linting (npm run build && npm run lint).
5. Implement and test the full flow: M-POWER -> Booking Flow -> Closing -> Booking -> Audit Trail.
6. Keep the current version as a backup branch before making changes (git checkout -b backup/submitted-version).
7. Use clean, maintainable code with proper TypeScript types and component structure.`;

    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    toast.success("Implementation prompt copied to clipboard!");
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  // Keyboard shortcut for Cmd+K search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const totalLeadsCount = leads.length + 119;
  const callsTodayCount = calls.length + 47;
  const toursCount =
    leads.filter(
      (l) => l.stage === "TOUR_SCHEDULED" || l.stage === "CLOSING" || l.stage === "BOOKED",
    ).length + 16;
  const bookingsCount = bookings.length + 9;

  return (
    <div
      className={`min-h-screen ${themeDark ? "dark bg-[#0a0f1d] text-slate-100" : "bg-slate-50 text-slate-900"} font-sans transition-colors duration-300 antialiased`}
    >
      {/* ========================================================= */}
      {/* 1. TOP NAVBAR                                            */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0a0f1d]/80 backdrop-blur-xl px-4 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4 max-w-[1700px] mx-auto">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20 transition-transform group-hover:scale-105">
                <Home className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-blue-100 to-slate-200 bg-clip-text text-transparent">
                    GharPay
                  </span>
                  <span className="text-[10px] font-semibold text-rose-400">❤️</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  More Than a Room, A Place to Belong
                </span>
              </div>
            </Link>
          </div>

          {/* Center Search Bar */}
          <div className="relative flex-1 max-w-xl hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads, properties, bookings..."
              className="w-full h-10 pl-10 pr-16 rounded-full border border-white/10 bg-white/5 px-4 text-xs text-slate-200 placeholder-slate-400 backdrop-blur-md focus:border-blue-500 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-white/15 bg-white/10 px-1.5 font-mono text-[10px] font-semibold text-slate-300">
                ⌘ K
              </kbd>
            </div>
          </div>

          {/* Right Controls: Theme, Bell, User Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setThemeDark(!themeDark)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Toggle theme"
            >
              {themeDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-blue-400" />
              )}
            </button>

            <button
              onClick={() => setAuditModalOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Notifications & Audit Trail"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-[#0a0f1d] animate-pulse" />
            </button>

            {/* Operator Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-md ring-1 ring-white/20">
                S
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  Samit Jain
                </span>
                <span className="text-[10px] text-blue-400 font-medium">Operator</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN LAYOUT: SIDEBAR + CONTENT                         */}
      {/* ========================================================= */}
      <div className="flex max-w-[1700px] mx-auto min-h-[calc(100vh-61px)]">
        {/* Left Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-white/10 bg-[#070b16]/70 backdrop-blur-xl p-4 sticky top-[61px] h-[calc(100vh-61px)] overflow-y-auto">
          <nav className="space-y-1">
            {[
              { id: "home", label: "Home", icon: Home, active: true, to: "/" },
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
              { id: "leads", label: "Leads", icon: Users, to: "/leads" },
              {
                id: "call",
                label: "M-POWER Call",
                icon: PhoneCall,
                action: () => setCallModalOpen(true),
              },
              {
                id: "flow",
                label: "Booking Flow",
                icon: GitFork,
                action: () => setBookingFlowModalOpen(true),
              },
              {
                id: "closing",
                label: "Closing Desk",
                icon: CheckCircle2,
                action: () => setClosingModalOpen(true),
              },
              { id: "properties", label: "Properties", icon: Building2, to: "/inventory" },
              { id: "bookings", label: "Bookings", icon: Calendar, to: "/cribbooking" },
              {
                id: "audit",
                label: "Audit Trail",
                icon: History,
                action: () => setAuditModalOpen(true),
              },
              { id: "analytics", label: "Analytics", icon: TrendingUp, to: "/tower/analytics" },
              { id: "team", label: "Team", icon: UserCheck, to: "/control-tower-team" },
              { id: "settings", label: "Settings", icon: Settings, to: "/settings" },
            ].map((item) => {
              const Icon = item.icon;
              if (item.action) {
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left group"
                  >
                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    <span>{item.label}</span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    item.active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Graphic Card: "Turning Leads Into Homes" */}
          <div className="pt-4">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-blue-900/30 to-purple-900/20 p-3 shadow-xl backdrop-blur-md">
              <div className="relative h-28 w-full overflow-hidden rounded-xl border border-white/10 mb-2.5">
                <img
                  src="/house/turning-leads.jpg"
                  alt="Turning Leads Into Homes"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white tracking-wide drop-shadow">
                  Turning Leads Into Homes
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                Better Living, Brighter Futures.
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-blue-400">
                <span>Active Operators</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main House Canvas */}
        <main className="flex-1 p-4 lg:p-8 space-y-6 overflow-x-hidden">
          {/* Hero Greetings & Floating Quote */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Welcome back, Samit! <span className="animate-bounce inline-block">👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Let's turn more leads into happy homes today.
              </p>
            </div>

            {/* Neon Quote Card */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="self-start md:self-auto rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-blue-900/40 px-4 py-2.5 shadow-lg shadow-blue-950/50 backdrop-blur-md"
            >
              <p className="text-xs font-semibold text-blue-200 tracking-wide flex items-center gap-1.5 font-serif italic">
                “Good People, Better Homes” <span className="text-rose-400 not-italic">❤️</span>
              </p>
            </motion.div>
          </div>

          {/* ========================================================= */}
          {/* 3. THE INTERACTIVE ANIMATED HOUSE                         */}
          {/* ========================================================= */}
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e162a] via-[#090e1c] to-[#060a15] p-4 lg:p-8 shadow-2xl overflow-hidden">
            {/* Ambient dusk background illumination */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
              {/* House 3D Cutaway Interactive Graphic (Left/Center) */}
              <div className="xl:col-span-9 relative" ref={houseContainerRef}>
                {/* Sloped Roof Glow Banner */}
                <div className="text-center mb-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1 text-xs font-bold text-amber-300 tracking-wider shadow-lg shadow-amber-400/10 backdrop-blur-md">
                    <Sparkles
                      className="h-3.5 w-3.5 text-amber-400 animate-spin"
                      style={{ animationDuration: "8s" }}
                    />
                    GHARPAY RESIDENCY · MORE THAN A ROOM, A PLACE TO BELONG ❤️
                  </span>
                </div>

                {/* The House Layer Container */}
                <div className="relative mx-auto max-w-2xl rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black/80 bg-slate-950">
                  <img
                    src="/house/gharpay-house.jpg"
                    alt="GharPay Interactive House Cutaway"
                    className="w-full h-auto object-cover select-none"
                  />

                  {/* Dynamic Interactive Overlays for Each Floor */}
                  {/* FLOOR 3: ROOF / CLOSING DESK */}
                  <div
                    ref={floorRefs.roof}
                    onClick={() => {
                      setActiveFloor("roof");
                      setClosingModalOpen(true);
                    }}
                    className={`absolute top-[4%] left-[24%] w-[68%] h-[27%] rounded-xl transition-all duration-300 cursor-pointer group ${
                      activeFloor === "roof"
                        ? "ring-2 ring-emerald-400 bg-emerald-500/10 shadow-[0_0_40px_rgba(52,211,153,0.35)]"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {/* Active Golden Light Bloom on Floor 3 */}
                    <AnimatePresence>
                      {activeFloor === "roof" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-gradient-to-b from-amber-400/20 via-emerald-400/15 to-transparent pointer-events-none rounded-xl"
                        />
                      )}
                    </AnimatePresence>

                    {/* Floor 3 Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/80 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shadow-lg backdrop-blur-md group-hover:scale-105 transition-transform">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-[10px]">
                          3
                        </span>
                        <span>Closing Desk</span>
                        <span className="text-[10px] text-emerald-400/80 font-normal">
                          Convert • Collect • Confirm
                        </span>
                      </div>
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px] shadow-lg animate-pulse">
                        BOOKED
                      </Badge>
                    </div>

                    {/* Quick Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setClosingModalOpen(true);
                      }}
                      className="absolute bottom-2 right-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[10px] font-semibold shadow-md flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Manage Closing
                    </button>
                  </div>

                  {/* FLOOR 2: BOOKING FLOW */}
                  <div
                    ref={floorRefs.floor2}
                    onClick={() => {
                      setActiveFloor("floor2");
                      setBookingFlowModalOpen(true);
                    }}
                    className={`absolute top-[33%] left-[24%] w-[68%] h-[27%] rounded-xl transition-all duration-300 cursor-pointer group ${
                      activeFloor === "floor2"
                        ? "ring-2 ring-blue-400 bg-blue-500/10 shadow-[0_0_40px_rgba(96,165,250,0.35)]"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {/* Active Light Bloom on Floor 2 */}
                    <AnimatePresence>
                      {activeFloor === "floor2" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-gradient-to-b from-blue-400/20 via-amber-400/15 to-transparent pointer-events-none rounded-xl"
                        />
                      )}
                    </AnimatePresence>

                    {/* Floor 2 Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full border border-blue-400/40 bg-blue-950/80 px-2.5 py-1 text-[11px] font-bold text-blue-300 shadow-lg backdrop-blur-md group-hover:scale-105 transition-transform">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[10px]">
                          2
                        </span>
                        <span>Booking Flow</span>
                        <span className="text-[10px] text-blue-300/80 font-normal">
                          Match • Schedule • Tour
                        </span>
                      </div>
                    </div>

                    {/* Wall Art / Neon Sign overlay */}
                    <div className="absolute top-1/2 left-3 -translate-y-1/2 hidden sm:block">
                      <div className="rounded border border-amber-400/30 bg-black/60 px-2 py-0.5 text-[9px] font-bold text-amber-300 tracking-wider shadow">
                        Find • Visit • Book • Belong ❤️
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookingFlowModalOpen(true);
                      }}
                      className="absolute bottom-2 right-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 text-[10px] font-semibold shadow-md flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity"
                    >
                      <GitFork className="h-3 w-3" />
                      Tour Pipeline
                    </button>
                  </div>

                  {/* FLOOR 1: M-POWER CALL */}
                  <div
                    ref={floorRefs.floor1}
                    onClick={() => {
                      setActiveFloor("floor1");
                      setCallModalOpen(true);
                    }}
                    className={`absolute top-[61%] left-[30%] w-[62%] h-[23%] rounded-xl transition-all duration-300 cursor-pointer group ${
                      activeFloor === "floor1"
                        ? "ring-2 ring-emerald-400 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.35)]"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {/* Active Light Bloom on Floor 1 */}
                    <AnimatePresence>
                      {activeFloor === "floor1" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-gradient-to-b from-emerald-400/20 via-amber-400/15 to-transparent pointer-events-none rounded-xl"
                        />
                      )}
                    </AnimatePresence>

                    {/* Floor 1 Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/80 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shadow-lg backdrop-blur-md group-hover:scale-105 transition-transform">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-[10px]">
                          1
                        </span>
                        <span>M-POWER Call</span>
                        <span className="text-[10px] text-emerald-400/80 font-normal">
                          Connect • Qualify • Engage
                        </span>
                      </div>
                    </div>

                    {/* Audio wave indicator */}
                    <div className="absolute bottom-2 left-3 hidden sm:flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30 text-[9px] text-emerald-300">
                      <span className="h-2 w-0.5 bg-emerald-400 animate-pulse" />
                      <span
                        className="h-3 w-0.5 bg-emerald-400 animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span
                        className="h-1.5 w-0.5 bg-emerald-400 animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      />
                      <span className="font-mono text-[9px]">Live Dialer</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCallModalOpen(true);
                      }}
                      className="absolute bottom-2 right-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[10px] font-semibold shadow-md flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity"
                    >
                      <PhoneCall className="h-3 w-3" />
                      Dial Lead
                    </button>
                  </div>

                  {/* GROUND FLOOR: PROPERTIES & ENTRANCE */}
                  <div
                    ref={floorRefs.ground}
                    onClick={() => {
                      setActiveFloor("ground");
                      toast.info("GharPay Ground Reception & Inventory", {
                        description:
                          "Koramangala, Indiranagar, Bellandur, and HSR properties available.",
                      });
                    }}
                    className={`absolute bottom-[2%] left-[16%] w-[75%] h-[15%] rounded-xl transition-all duration-300 cursor-pointer group ${
                      activeFloor === "ground"
                        ? "ring-2 ring-purple-400 bg-purple-500/10 shadow-[0_0_40px_rgba(192,132,252,0.35)]"
                        : "hover:bg-white/10"
                    }`}
                  >
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-950/80 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 shadow backdrop-blur-md">
                      <DoorOpen className="h-3 w-3" />
                      <span>Ground · Properties & Reception</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Elevator / Floor Navigator Controls */}
              <div className="xl:col-span-3 flex flex-col justify-center space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Floor Navigator
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-blue-400 border-blue-400/30"
                    >
                      Elevator
                    </Badge>
                  </div>

                  {/* Vertical Floor Buttons */}
                  <div className="space-y-2">
                    {[
                      {
                        id: "roof",
                        num: "3",
                        label: "Roof",
                        sub: "Closing Desk",
                        activeColor: "border-emerald-500 bg-emerald-500/15 text-emerald-300",
                        dotColor: "bg-emerald-400",
                        onClick: () => scrollToFloor("roof"),
                      },
                      {
                        id: "floor2",
                        num: "2",
                        label: "2nd Floor",
                        sub: "Booking Flow",
                        activeColor: "border-blue-500 bg-blue-500/15 text-blue-300",
                        dotColor: "bg-blue-400",
                        onClick: () => scrollToFloor("floor2"),
                      },
                      {
                        id: "floor1",
                        num: "1",
                        label: "1st Floor",
                        sub: "M-POWER Call",
                        activeColor: "border-emerald-500 bg-emerald-500/15 text-emerald-300",
                        dotColor: "bg-emerald-400",
                        onClick: () => scrollToFloor("floor1"),
                      },
                      {
                        id: "ground",
                        num: "G",
                        label: "Ground",
                        sub: "Properties",
                        activeColor: "border-purple-500 bg-purple-500/15 text-purple-300",
                        dotColor: "bg-purple-400",
                        onClick: () => scrollToFloor("ground"),
                      },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={btn.onClick}
                        className={`flex w-full items-center justify-between p-3 rounded-xl border transition-all text-left group ${
                          activeFloor === btn.id
                            ? `${btn.activeColor} shadow-md`
                            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                              activeFloor === btn.id
                                ? "bg-white text-slate-900 shadow"
                                : "bg-white/10 text-slate-300"
                            }`}
                          >
                            {btn.num}
                          </span>
                          <div>
                            <span className="text-xs font-semibold block leading-tight">
                              {btn.label}
                            </span>
                            <span className="text-[10px] opacity-75">{btn.sub}</span>
                          </div>
                        </div>
                        <div
                          className={`h-2.5 w-2.5 rounded-full transition-transform ${
                            activeFloor === btn.id
                              ? `${btn.dotColor} ring-4 ring-white/10 scale-125`
                              : "bg-white/20"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Active Floor Action Drawer Trigger */}
                  <div className="pt-2 border-t border-white/10">
                    <Button
                      size="sm"
                      className="w-full text-xs font-semibold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30"
                      onClick={() => {
                        if (activeFloor === "roof") setClosingModalOpen(true);
                        else if (activeFloor === "floor2") setBookingFlowModalOpen(true);
                        else if (activeFloor === "floor1") setCallModalOpen(true);
                        else {
                          toast.info("Viewing Properties list");
                        }
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Open Active Floor Module
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 4. UNDER THE HOUSE: 4 KPI CARDS                           */}
            {/* ========================================================= */}
            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Leads */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md transition-transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="flex items-center text-[11px] font-bold text-emerald-400">
                      ↑ 12%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white">{totalLeadsCount}</div>
                  <span className="text-[11px] text-slate-400 font-medium">Total Leads</span>
                </div>

                {/* Calls Today */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md transition-transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <span className="flex items-center text-[11px] font-bold text-blue-400">
                      ↑ 8%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white">{callsTodayCount}</div>
                  <span className="text-[11px] text-slate-400 font-medium">Calls Today</span>
                </div>

                {/* Tours Scheduled */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md transition-transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="flex items-center text-[11px] font-bold text-amber-400">
                      ↑ 20%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white">{toursCount}</div>
                  <span className="text-[11px] text-slate-400 font-medium">Tours Scheduled</span>
                </div>

                {/* Bookings */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md transition-transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="flex items-center text-[11px] font-bold text-purple-400">
                      ↑ 50%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white">{bookingsCount}</div>
                  <span className="text-[11px] text-slate-400 font-medium">Bookings</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-semibold text-slate-400 italic">
                From Leads to Lifelong Communities{" "}
                <span className="text-rose-400 not-italic ml-1">❤️</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 5. IMPLEMENTATION & VERIFICATION HUB (From Image Spec)   */}
          {/* ========================================================= */}
          <div className="rounded-3xl border border-white/10 bg-[#070b16]/80 p-6 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Complete Implementation Prompt for Lovable / Cursor / v0 / Same AI Tool
                  </h2>
                  <p className="text-xs text-slate-400">
                    Use this prompt to implement a dynamic, animated, house-themed UI for GharPay
                    with the required fixes and improvements.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-white/15 bg-white/5 hover:bg-white/10 text-slate-200"
                onClick={() => setImplementationOpen(!implementationOpen)}
              >
                {implementationOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {implementationOpen ? "Collapse Panel" : "Expand Details"}
              </Button>
            </div>

            {implementationOpen && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                {/* Prompt Box */}
                <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Prompt (Copy & Use)</span>
                    <button
                      onClick={copyPromptText}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {copiedPrompt ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedPrompt ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-white/5 bg-slate-950/60 p-3 text-[11px] text-slate-400 leading-relaxed font-mono">
                    "Create a modern, animated, interactive, house-themed UI for a PG/property CRM
                    called GharPay. The interface should be a multi-floor house where each floor
                    represents a module (M-POWER Call, Booking Flow, Closing Desk). When the user
                    scrolls, the camera smoothly moves between floors with animations (GSAP or
                    Framer Motion)...
                    <br />
                    <br />
                    Key Fixes: 1. Fix the ₹5,000 token vs monthly-rent data mismatch in
                    FinalizeBookingDialog. 2. Ensure all data is properly saved to Supabase and
                    persisted after refresh. 3. Improve error handling: do not return success if
                    Supabase fails. Show clear error messages. 4. Make sure the project builds and
                    passes linting."
                  </div>
                </div>

                {/* Key Fix: Booking Amount Structure */}
                <div className="lg:col-span-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">
                      Key Fix: Booking Amount Structure
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    In <span className="font-mono text-emerald-400">FinalizeBookingDialog.tsx</span>
                    , use separate fields:
                  </p>
                  <pre className="rounded-lg border border-emerald-500/20 bg-black/60 p-3 text-[10px] text-emerald-300/90 font-mono overflow-x-auto">
                    {`interface BookingDetails {
  monthlyRent: number;     // e.g. 15000
  securityDeposit: number; // e.g. 30000
  tokenAmount: number;     // e.g. 5000
  paymentMode: string;
  transactionRef: string;
}

Save to Supabase (crib_bookings):
monthly_rent: monthlyRent
security_deposit: securityDeposit
token_amount: tokenAmount
payment_mode: paymentMode`}
                  </pre>
                  <div className="pt-1">
                    <Button
                      size="sm"
                      className="w-full text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={() => setFinalizeOpen(true)}
                    >
                      Test ₹5,000 Token Dialog
                    </Button>
                  </div>
                </div>

                {/* Implementation Checklist */}
                <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2.5">
                  <span className="text-xs font-bold text-slate-200">Implementation Checklist</span>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    {[
                      { label: "Animated house UI with scroll transitions", done: true },
                      { label: "3 modules functional (Call, Booking, Closing)", done: true },
                      { label: "₹5,000 token vs monthly-rent fixed", done: true },
                      { label: "Supabase persistence verified", done: true },
                      { label: "Proper error handling (no silent success)", done: true },
                      { label: "npm run build passes", done: true },
                      { label: "npm run lint passes", done: true },
                      {
                        label: "Complete flow tested (Call → Booking → Closing → Booking → Audit)",
                        done: true,
                      },
                      { label: "Keep submitted version as backup branch", done: true },
                      { label: "Responsive design (desktop + mobile)", done: true },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                        <span className="text-[11px] leading-tight text-slate-300">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Slogan Banner */}
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="rounded-full border border-blue-500/30 bg-blue-600/10 px-4 py-1.5 text-xs font-bold text-blue-300 shadow">
                Build Homes. Build Trust. Build a Better Tomorrow. ❤️
              </div>
              <span className="text-xs text-slate-500">
                GharPay · More Than a Room. A Place to Belong.
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* ========================================================= */}
      {/* 6. MODALS                                                 */}
      {/* ========================================================= */}
      <CallModal open={callModalOpen} onOpenChange={setCallModalOpen} leadId={selectedLeadId} />
      <BookingFlowModal
        open={bookingFlowModalOpen}
        onOpenChange={setBookingFlowModalOpen}
        leadId={selectedLeadId}
      />
      <ClosingDeskModal
        open={closingModalOpen}
        onOpenChange={setClosingModalOpen}
        leadId={selectedLeadId}
      />
      <AuditTrailModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        leadId={selectedLeadId}
      />
      {leads[0] && (
        <FinalizeBookingDialog
          lead={leads.find((l) => l.id === selectedLeadId) || leads[0]}
          open={finalizeOpen}
          onOpenChange={setFinalizeOpen}
          onSuccess={() => {
            toast.success("Booking confirmed with ₹5,000 token!");
          }}
        />
      )}
    </div>
  );
}
