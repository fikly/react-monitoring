import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import Login from '@/pages/Login';
import Overview from '@/pages/Overview';
import PageViews from '@/pages/PageViews';
import Errors from '@/pages/Errors';
import Performance from '@/pages/Performance';
import ApiCalls from '@/pages/ApiCalls';
import Settings from '@/pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#5F5DFF',
              fontFamily: 'Inter, sans-serif',
              borderRadius: 8,
            },
          }}
        >
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppProvider>
                      <AppLayout />
                    </AppProvider>
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Overview />} />
                <Route path="/page-views" element={<PageViews />} />
                <Route path="/errors" element={<Errors />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/api-calls" element={<ApiCalls />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
