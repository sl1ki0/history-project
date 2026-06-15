import { lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import LoadingScreen from './components/LoadingScreen'

const MainHallPage = lazy(() => import('./pages/MainHallPage'))
const ExcursionPage = lazy(() => import('./pages/ExcursionPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
export default function App() {
  const location = useLocation()
  return (
    <Layout>
      <Suspense fallback={<LoadingScreen />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/hall" element={<MainHallPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/excursion/:id" element={<ExcursionPage />} />
            <Route path="/excursion/:id/quiz" element={<QuizPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </Layout>
  )
}
