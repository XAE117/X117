import TopBar from './TopBar.jsx'
import GodfatherAlert from './GodfatherAlert.jsx'
import BackPill from './BackPill.jsx'
import Footer from './Footer.jsx'
import LoadingSpinner from './LoadingSpinner.jsx'
import Splash from '../views/Splash.jsx'
import RoutesView from '../Routes.jsx'
import { useAppDataContext } from '../context/useAppDataContext'
import { useAppUIContext } from '../context/useAppUIContext'

export default function AppShell() {
  const { data, jazzData, foodData, loading } = useAppDataContext()
  const {
    isJazz,
    isFood,
    isGuide,
    isRoll,
    isScrolling,
    isScreenshotRoute,
    isDetailPage,
    showBackPill,
    splashSeen,
    setSplashSeen,
  } = useAppUIContext()

  if (loading) return <LoadingSpinner />

  if (!data) {
    return (
      <div className="error-state" role="alert">
        <h2>Unable to load data</h2>
        <p>Please try refreshing the page.</p>
      </div>
    )
  }

  if (isScreenshotRoute) return <RoutesView standalone />

  return (
    <div className={`app ${isJazz ? 'jazz-mode' : ''} ${isFood ? 'food-mode' : ''} ${isGuide ? 'guide-mode' : ''} ${isRoll ? 'roll-mode' : ''} ${isScrolling ? 'ui-scrolling' : ''}`}>
      {!splashSeen && <Splash onEnter={() => setSplashSeen(true)} />}
      {!isDetailPage && <TopBar />}
      {!isDetailPage && !isJazz && !isFood && !isGuide && !isRoll && <GodfatherAlert data={data} />}
      <main className="main-content">
        <RoutesView />
      </main>
      <Footer
        lastUpdated={isJazz && jazzData ? jazzData.lastUpdated : isFood && foodData ? foodData.lastUpdated : data?.lastUpdated}
        theaters={isJazz && jazzData ? jazzData.venues : data?.theaters}
        isJazz={isJazz}
        isFood={isFood}
      />
      {showBackPill && <BackPill />}
    </div>
  )
}
