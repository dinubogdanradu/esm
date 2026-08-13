import { HashRouter } from 'react-router-dom'
import AppRoutes from '@/AppRoutes'

/**
 * HashRouter rather than BrowserRouter: GitHub Pages has no rewrite rules, so a
 * path-based deep link like /build/projects would 404 on refresh.
 */
export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
