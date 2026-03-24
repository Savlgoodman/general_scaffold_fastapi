import { useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import MainLayout from "@/components/layout/MainLayout"
import Login from "@/pages/Login"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { Toaster } from "@/components/ui/toaster"
import { appRoutes } from "@/routes"
import { useSiteConfigStore } from "@/store/site-config"

function App() {
  const fetchConfig = useSiteConfigStore((s) => s.fetchConfig)

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {appRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
