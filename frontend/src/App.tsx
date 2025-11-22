import { AuthProvider } from './contexts/AuthContext'
import AppRoutes from './routes'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  )
}

