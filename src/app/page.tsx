"use client";

import { NetworkBackground } from "@/components/background/NetworkBackground";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full bg-transparent">
      {/* Animated Network Background */}
      <NetworkBackground />
      
      {/* Top Header */}
      <HUDOverlay />
      
      {/* Main Layout */}
      <div className="relative z-10 flex min-h-screen pt-14">
        {/* Sidebar */}
        <ModMenuSidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 ml-64 p-8 overflow-auto h-[calc(100vh-3.5rem)]">
          <Dashboard />
        </div>
      </div>
    </main>
  );
}
