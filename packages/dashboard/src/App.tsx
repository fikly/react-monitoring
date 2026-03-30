import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import AppLayout from '@/components/AppLayout';
import Overview from '@/pages/Overview';
import PageViews from '@/pages/PageViews';
import Errors from '@/pages/Errors';
import Performance from '@/pages/Performance';
import ApiCalls from '@/pages/ApiCalls';

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
            <Route element={<AppLayout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/page-views" element={<PageViews />} />
              <Route path="/errors" element={<Errors />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/api-calls" element={<ApiCalls />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
