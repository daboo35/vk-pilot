import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/components/ToastProvider';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Dashboard from '@/pages/Dashboard';
import CreatePost from '@/pages/CreatePost';
import Scheduled from '@/pages/Scheduled';
import Templates from '@/pages/Templates';
import Stats from '@/pages/Stats';
import Settings from '@/pages/Settings';

export function App() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#09090B] text-white">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-0 md:ml-64 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/scheduled" element={<Scheduled />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <MobileNav />
      </div>
    </ToastProvider>
  );
}
