import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import Home from "@/pages/Home";
import EnrollmentPage from "@/pages/EnrollmentPage";
import EliteAccessPage from "@/pages/EliteAccessPage";
import Login from "@/pages/Login";
import PortalSignup from "@/pages/PortalSignup";
import AppIndex from "@/pages/AppIndex";
import StudentHome from "@/pages/StudentHome";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminProducts from "@/pages/AdminProducts";
import AdminCourseCreate from "@/pages/AdminCourseCreate";
import AdminCourseEditor from "@/pages/AdminCourseEditor";
import CoursePlayer from "@/pages/CoursePlayer";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/acesso-elite" element={<EliteAccessPage />} />
            <Route path="/cadastro" element={<PortalSignup />} />
            <Route path="/cadastro/:slug" element={<EnrollmentPage />} />
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/app" element={<AppIndex />} />
              <Route path="/app/minha-area" element={<StudentHome />} />
              <Route path="/app/admin" element={<AdminDashboard />} />
              <Route path="/app/admin/produtos" element={<AdminProducts />} />
              <Route path="/app/admin/produtos/novo" element={<AdminCourseCreate />} />
              <Route path="/app/admin/produtos/:courseId" element={<AdminCourseEditor />} />
              <Route path="/app/curso/:courseId" element={<CoursePlayer />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
