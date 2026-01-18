"use client";

import { MatrixRain } from "@/components/background/MatrixRain";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full">
      {/* Background Effects */}
      <MatrixRain />
      
      {/* HUD Overlay - Top bar */}
      <HUDOverlay />
      
      {/* Main Layout */}
      <div className="flex min-h-screen pt-12">
        {/* Mod Menu Sidebar */}
        <ModMenuSidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 ml-64 p-6 overflow-auto h-[calc(100vh-3rem)]">
          <Dashboard />
        </div>
      </div>
    </main>
  );
}
