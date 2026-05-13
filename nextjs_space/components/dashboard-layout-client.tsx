"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  Plus,
  Settings,
  LogOut,
  Menu,
  X,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatbotWidget from "@/components/chatbot-widget";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/new", icon: Plus, label: "New Project" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" }
];

export default function DashboardLayoutClient({
  children
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900/50 border-r border-gray-800 transform transition-transform lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">AI Ad Workflow</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems?.map((item) => {
              const Icon = item?.icon;
              const isActive = pathname === item?.href;
              return (
                <Link
                  key={item?.href ?? ""}
                  href={item?.href ?? ""}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-purple-600/20 text-purple-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  <span>{item?.label ?? ""}</span>
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {session?.user?.name?.[0]?.toUpperCase?.() ?? session?.user?.email?.[0]?.toUpperCase?.() ?? "U"}
                </div>
                <div className="text-sm">
                  <div className="text-gray-200 truncate max-w-[120px]">
                    {session?.user?.name ?? session?.user?.email ?? "User"}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">AI Ad Workflow</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Chatbot toggle (desktop) */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="hidden lg:flex fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 rounded-full items-center justify-center shadow-lg shadow-purple-500/25 transition-colors z-40"
      >
        {chatOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chatbot widget */}
      <ChatbotWidget isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
