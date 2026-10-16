import { useState } from 'react';
import { ThemeProvider } from '@/hooks/useTheme';
import { ToastProvider } from '@/components/Toast';
import { AdminSidebar, NavTab } from '@/components/AdminSidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { AdminPanels } from '@/components/AdminPanels';
import { useHealthCheck } from '@/hooks/useHealthCheck';

function AppContent() {
  const { healthy } = useHealthCheck();
  const [activeTab, setActiveTab] = useState<NavTab>('chat');

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex overflow-hidden font-sans">
      {/* Admin Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        backendHealthy={healthy}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-[#fafafb]">
        {activeTab === 'chat' ? (
          <ChatInterface backendHealthy={healthy} />
        ) : (
          <AdminPanels tab={activeTab} />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;