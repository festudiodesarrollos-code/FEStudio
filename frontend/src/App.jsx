import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardClient from './pages/DashboardClient';
import Page from './pages/Page'; // Mueve tu componente Landing del paso anterior a este archivo

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Page />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requireSuperUser>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/client" 
            element={
              <ProtectedRoute requireClient>
                <DashboardClient />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;