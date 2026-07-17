import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom'
import ByTheater from './views/ByTheater.jsx'
import ByDay from './views/ByDay.jsx'
import Tonight from './views/Tonight.jsx'
import Detail from './views/Detail.jsx'
import Watchlist from './views/Watchlist.jsx'
import MapView from './views/MapView.jsx'
import Search from './views/Search.jsx'
import JazzByVenue from './views/JazzByVenue.jsx'
import JazzByDay from './views/JazzByDay.jsx'
import JazzTonight from './views/JazzTonight.jsx'
import JazzDetail from './views/JazzDetail.jsx'
import JazzMapView from './views/JazzMapView.jsx'
import JazzByProximity from './views/JazzByProximity.jsx'
import JazzBioEssay from './views/JazzBioEssay.jsx'
import JazzDayScreenshot from './views/JazzDayScreenshot.jsx'
import FoodByCategory from './views/FoodByCategory.jsx'
import FoodStarred from './views/FoodStarred.jsx'
import EatsByTier from './views/EatsByTier.jsx'
import EatsNew from './views/EatsNew.jsx'
import EatsDetail from './views/EatsDetail.jsx'
import EatsMapView from './views/EatsMapView.jsx'
import PizzaGuide from './views/PizzaGuide.jsx'
import TacoGuide from './views/TacoGuide.jsx'
import GuidePage from './views/GuidePage.jsx'
import GuideHub from './views/GuideHub.jsx'
import PizzaGuideEssay from './views/PizzaGuideEssay.jsx'
import DateNightGenerator from './views/DateNightGenerator.jsx'
import DayScreenshot from './views/DayScreenshot.jsx'
import { useAppDataContext } from './context/useAppDataContext'
import { useAppUIContext } from './context/useAppUIContext'

function SmartCinemaDefault({ filteredData, searchQuery }) {
  return <ByDay data={filteredData} searchQuery={searchQuery} />
}

export default function RoutesView({ standalone = false }) {
  const { data, jazzData, foodData, guideData, bioData } = useAppDataContext()
  const { filteredData, searchQuery, vibe } = useAppUIContext()

  if (standalone) {
    return (
      <RouterRoutes>
        <Route path="/day/:date" element={<DayScreenshot data={data} />} />
        <Route path="/jazz/day/:date" element={<JazzDayScreenshot data={jazzData} />} />
      </RouterRoutes>
    )
  }

  return (
    <RouterRoutes>
      <Route path="/welcome" element={<Navigate to="/" replace />} />

      <Route path="/" element={<SmartCinemaDefault filteredData={filteredData} searchQuery={searchQuery} />} />
      <Route path="/tonight" element={<Tonight data={data} />} />
      <Route path="/by-theater" element={<ByTheater data={filteredData} />} />
      <Route path="/screening/:screeningId" element={<Detail data={data} />} />
      <Route path="/watchlist" element={<Watchlist data={data} />} />
      <Route path="/map" element={<MapView data={filteredData} />} />
      <Route path="/search" element={<Search data={filteredData} />} />

      <Route path="/jazz" element={<JazzByDay data={jazzData} />} />
      <Route path="/jazz/tonight" element={<JazzTonight data={jazzData} />} />
      <Route path="/jazz/by-venue" element={<JazzByVenue data={jazzData} />} />
      <Route path="/jazz/show/:showId" element={<JazzDetail data={jazzData} />} />
      <Route path="/jazz/proximity" element={<JazzByProximity data={jazzData} />} />
      <Route path="/jazz/map" element={<JazzMapView data={jazzData} />} />
      <Route path="/jazz/bio" element={<JazzBioEssay bioData={bioData} />} />

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
      <Route path="/guide/tacos" element={<GuidePage guideData={guideData} />} />
      <Route path="/guide/pizza" element={<PizzaGuideEssay />} />
      <Route path="*" element={
        <div style={{ color: '#E88A82', padding: '2rem', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8rem' }}>
          <p>No route matched: {window.location.pathname}</p>
          <p>basename: /X117</p>
        </div>
      } />
    </RouterRoutes>
  )
}
