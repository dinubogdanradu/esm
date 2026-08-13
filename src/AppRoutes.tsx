import { Navigate, Route, Routes } from 'react-router-dom'
import CvBuilder from '@/builder/CvBuilder'
import { FIRST_STEP_ID } from '@/builder/steps'

/**
 * Split from App so tests can mount the routes inside a MemoryRouter.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/build/:stepId" element={<CvBuilder />} />
      <Route
        path="*"
        element={<Navigate to={`/build/${FIRST_STEP_ID}`} replace />}
      />
    </Routes>
  )
}
