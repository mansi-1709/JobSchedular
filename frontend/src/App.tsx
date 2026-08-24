import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthLayout, ProtectedLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { QueuesPage } from './pages/QueuesPage';
import { QueueDetailPage } from './pages/QueueDetailPage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { WorkersPage } from './pages/WorkersPage';
import { MetricsPage } from './pages/MetricsPage';
import { DeadLetterPage } from './pages/DeadLetterPage';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout><Outlet /></AuthLayout>}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected Dashboard Routes */}
            <Route element={<ProtectedLayout><DashboardLayout><Outlet /></DashboardLayout></ProtectedLayout>}>
              <Route path="/" element={<DashboardPage />} />
              
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              
              <Route path="/queues" element={<QueuesPage />} />
              <Route path="/queues/:id" element={<QueueDetailPage />} />
              
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              
              <Route path="/workers" element={<WorkersPage />} />
              
              <Route path="/metrics" element={<MetricsPage />} />
              
              <Route path="/dlq" element={<DeadLetterPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
