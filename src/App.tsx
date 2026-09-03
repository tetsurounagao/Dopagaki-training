import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RoutineListScreen } from './features/routine/RoutineListScreen'
import { OnboardingScreen } from './features/onboarding/OnboardingScreen'
import { WorkoutScreen } from './features/workout/WorkoutScreen'
import { ResultScreen } from './features/result/ResultScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoutineListScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/workout" element={<WorkoutScreen />} />
        <Route path="/result" element={<ResultScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
