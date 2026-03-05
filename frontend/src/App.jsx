import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, useLocation } from "react-router-dom";
import LandingPage from "@/pages/LandingPage"
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import Workspace from "@/pages/Workspace"
import NotFound from "@/utils/components/NotFound"
import Loading from "@/utils/components/Loading"
import { ThemeProvider } from "@/utils/contexts/ThemeProvider"
import { AuthProvider }from "@/utils/contexts/AuthProvider"
import { useAuth } from "@/utils/hooks/useAuth"


const Protected = ({ children }) => {
  const { auth, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) return <Loading />;

  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/">
        {/* Public routes — accessible without login */}
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Protected routes — require authentication */}
        <Route
          path="workspace"
          element={
            <Protected>
              <Workspace />
            </Protected>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  )
);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App