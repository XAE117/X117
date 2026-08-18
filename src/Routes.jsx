import { lazy, Suspense, useEffect } from 'react'
import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import { useAppDataContext } from './context/useAppDataContext'
import { useAppUIContext } from './context/useAppUIContext'
import LegalPage from './views/LegalPages.jsx'

const ByTheater = lazy(() => import('./views/ByTheater.jsx'))
const ByDay = lazy(() => import('./views/ByDay.jsx'))
const AmcLosAngeles = lazy(() => import('./views/AmcLosAngeles.jsx'))
const Tonight = lazy(() => import('./views/Tonight.jsx'))
const Detail = lazy(() => import('./views/Detail.jsx'))
const Watchlist = lazy(() => import('./views/Watchlist.jsx'))
const MapView = lazy(() => import('./views/MapView.jsx'))
const Search = lazy(() => import('./views/Search.jsx'))
const JazzByVenue = lazy(() => import('./views/JazzByVenue.jsx'))
const JazzByDay = lazy(() => import('./views/JazzByDay.jsx'))
const JazzTonight = lazy(() => import('./views/JazzTonight.jsx'))
const JazzDetail = lazy(() => import('./views/JazzDetail.jsx'))
const JazzMapView = lazy(() => import('./views/JazzMapView.jsx'))
const JazzByProximity = lazy(() => import('./views/JazzByProximity.jsx'))
const JazzBioEssay = lazy(() => import('./views/JazzBioEssay.jsx'))
const JazzDayScreenshot = lazy(() => import('./views/JazzDayScreenshot.jsx'))
const FoodByCategory = lazy(() => import('./views/FoodByCategory.jsx'))
const FoodStarred = lazy(() => import('./views/FoodStarred.jsx'))
const EatsByTier = lazy(() => import('./views/EatsByTier.jsx'))
const EatsNew = lazy(() => import('./views/EatsNew.jsx'))
const EatsDetail = lazy(() => import('./views/EatsDetail.jsx'))
const EatsMapView = lazy(() => import('./views/EatsMapView.jsx'))
const PizzaGuide = lazy(() => import('./views/PizzaGuide.jsx'))
const TacoGuide = lazy(() => import('./views/TacoGuide.jsx'))
const GuidePage = lazy(() => import('./views/GuidePage.jsx'))
const GuideHub = lazy(() => import('./views/GuideHub.jsx'))
const PizzaGuideEssay = lazy(() => import('./views/PizzaGuideEssay.jsx'))
const DateNightGenerator = lazy(() => import('./views/DateNightGenerator.jsx'))
const EveningDashboard = lazy(() => import('./views/EveningDashboard.jsx'))
const DayScreenshot = lazy(() => import('./views/DayScreenshot.jsx'))

function BiographyRoute() {
  const { bioData, loadBioData } = useAppDataContext()
  useEffect(() => {
    loadBioData().catch(error => console.error('Unable to load biography:', error))
  }, [loadBioData])
  return bioData ? <JazzBioEssay bioData={bioData} /> : <LoadingSpinner />
}

function TacoGuideRoute() {
  const { guideData, loadGuideData } = useAppDataContext()
  useEffect(() => {
    loadGuideData().catch(error => console.error('Unable to load guide:', error))
  }, [loadGuideData])
  return guideData ? <GuidePage guideData={guideData} /> : <LoadingSpinner />
}

export default function RoutesView({ standalone = false }) {
  const { data, jazzData, foodData } = useAppDataContext()
  const { filteredData, searchQuery, vibe } = useAppUIContext()

  if (standalone) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <RouterRoutes>
          <Route path="/day/:date" element={<DayScreenshot data={data} />} />
          <Route path="/jazz/day/:date" element={<JazzDayScreenshot data={jazzData} />} />
        </RouterRoutes>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RouterRoutes>
        <Route path="/welcome" element={<Navigate to="/" replace />} />

        <Route path="/" element={<EveningDashboard cinemaData={data} jazzData={jazzData} foodData={foodData} />} />
        <Route path="/browse" element={<ByDay data={filteredData} searchQuery={searchQuery} />} />
        <Route path="/amc" element={<AmcLosAngeles data={filteredData} searchQuery={searchQuery} />} />
        <Route path="/tonight" element={<Tonight data={data} />} />
        <Route path="/by-theater" element={<ByTheater data={filteredData} />} />
        <Route path="/screening/:screeningId" element={<Detail data={data} />} />
        <Route path="/watchlist" element={<Watchlist data={data} />} />
        <Route path="/map" element={<MapView data={filteredData} />} />
        <Route path="/search" element={<Search cinemaData={data} jazzData={jazzData} foodData={foodData} />} />

        <Route path="/jazz" element={<JazzByDay data={jazzData} />} />
        <Route path="/jazz/tonight" element={<JazzTonight data={jazzData} />} />
        <Route path="/jazz/by-venue" element={<JazzByVenue data={jazzData} />} />
        <Route path="/jazz/show/:showId" element={<JazzDetail data={jazzData} />} />
        <Route path="/jazz/proximity" element={<JazzByProximity data={jazzData} />} />
        <Route path="/jazz/map" element={<JazzMapView data={jazzData} />} />
        <Route path="/jazz/bio" element={<BiographyRoute />} />

        <Route path="/food" element={<FoodByCategory data={foodData} />} />
        <Route path="/food/pizza" element={<PizzaGuide data={foodData} />} />
        <Route path="/food/tacos" element={<TacoGuide data={foodData} />} />
        <Route path="/food/tiers" element={<EatsByTier data={foodData} />} />
        <Route path="/food/new" element={<EatsNew data={foodData} />} />
        <Route path="/food/starred" element={<FoodStarred data={foodData} />} />
        <Route path="/food/spot/:spotId" element={<EatsDetail data={foodData} />} />
        <Route path="/food/map" element={<EatsMapView data={foodData} />} />

        <Route path="/roll" element={<DateNightGenerator cinemaData={data} jazzData={jazzData} foodData={foodData} vibe={vibe} />} />

        <Route path="/guide" element={<GuideHub />} />
        <Route path="/guide/tacos" element={<TacoGuideRoute />} />
        <Route path="/guide/pizza" element={<PizzaGuideEssay />} />

        <Route path="/privacy" element={<LegalPage page="privacy" />} />
        <Route path="/terms" element={<LegalPage page="terms" />} />
        <Route path="/support" element={<LegalPage page="support" />} />
        <Route path="/credits" element={<LegalPage page="credits" />} />
        <Route path="*" element={
          <div className="route-not-found">
            <h1>That page slipped off the calendar.</h1>
            <p>The listing may have moved or expired.</p>
            <a href={import.meta.env.BASE_URL}>Return to tonight</a>
          </div>
        } />
      </RouterRoutes>
    </Suspense>
  )
}
