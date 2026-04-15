import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/login/Login'
import Dashboard from './pages/dashboard/Dashboard'
import TaskList from './pages/tasks/TaskList'
import UserList from './pages/users/UserList'
import LocationManagement from './pages/locations/LocationManagement'
import ZoneManagement from './pages/zones/ZoneManagement'
import SystemConfig from './pages/settings/SystemConfig'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'tasks',
        element: <TaskList />,
      },
      {
        path: 'users',
        element: <UserList />,
      },
      {
        path: 'locations',
        element: <LocationManagement />,
      },
      {
        path: 'zones',
        element: <ZoneManagement />,
      },
      {
        path: 'settings',
        element: <SystemConfig />,
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
