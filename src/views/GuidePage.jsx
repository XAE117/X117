import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import GuideRestaurantCard from '../components/GuideRestaurantCard.jsx'
import './GuidePage.css'
import './PizzaGuideEssay.css'

const SECTIONS = [
  { id: 'nixtamal-revolution', title: 'The Nixtamal Revolution', emoji: '🌽' },
  { id: 'trompo-masters', title: 'The Trompo Masters', emoji: '🔥' },
  { id: 'regional-kingdoms', title: 'Regional Kingdoms', emoji: '🗺️' },
  { id: 'specialists', title: 'The Specialists', emoji: '🥘' },
  { id: 'salsa-architecture', title: 'The Architecture of Salsa', emoji: '🫙' },
  { id: 'michelin-recognition', title: 'When Street Food Gets Stars', emoji: '⭐' },
  { id: 'taco-madness', title: 'The Living Tournament', emoji: '🏆' },
]

function R({ id, data, children }) {
  const r = data?.find(r => r.id === id)
  return <GuideRestaurantCard restaurant={r}>{children}</GuideRestaurantCard>
}

function GuidePage({ guideData }) {
  const [activeSection, setActiveSection] = useState(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [tocDesktopOpen, setTocDesktopOpen] = useState(false)
  const [tocFaded, setTocFaded] = useState(false)
  const observerRef = useRef(null)
  const scrollTimerRef = useRef(null)

  const restaurants = useMemo(() => guideData?.restaurants || [], [guideData])

  // TOC scroll fade: 95% transparent on scroll, fade back over 2s after 2s idle
  useEffect(() => {
    const handleScroll = () => {
      setTocFaded(true)
      clearTimeout(scrollTimerRef.current)
      // Remove class shortly after scroll stops — CSS transition-delay handles the 1s pause,
      // then CSS transition-duration handles the 3s fade-back
      scrollTimerRef.current = setTimeout(() => {
        setTocFaded(false)
      }, 200)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const ids = SECTIONS.map(s => s.id)
    const els = ids.map(id => document.getElementById(id)).filter(Boolean)

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )

    els.forEach(el => observerRef.current.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTocOpen(false)
  }

  return (
    <div className="guide-page">
      {/* Back to listings */}
      <div className="guide-essay-back-wrap">
        <Link to="/food/tacos" className="guide-essay-back-btn">
          ← Taco Listings
        </Link>
      </div>

      {/* ── Table of Contents: Desktop floating panel ── */}
      <nav className={`guide-toc-desktop ${tocDesktopOpen ? 'open' : 'collapsed'} ${tocFaded ? 'scroll-faded' : ''}`}>
        <button
          className="guide-toc-desktop-toggle"
          onClick={() => setTocDesktopOpen(!tocDesktopOpen)}
          aria-label={tocDesktopOpen ? 'Collapse table of contents' : 'Expand table of contents'}
        >
          <span className="guide-toc-desktop-toggle-icon">{tocDesktopOpen ? '−' : '+'}</span>
          <span className="guide-toc-desktop-toggle-label">Navigation</span>
        </button>
        {tocDesktopOpen && (
          <div className="guide-toc-desktop-items">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                className={`guide-toc-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => scrollTo(s.id)}
              >
                <span className="guide-toc-emoji">{s.emoji}</span>
                <span className="guide-toc-text">{s.title}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Table of Contents: Mobile collapsible ── */}
      <nav className={`guide-toc-mobile ${tocOpen ? 'open' : ''}`}>
        <button className="guide-toc-toggle" onClick={() => setTocOpen(!tocOpen)}>
          <span>Contents</span>
          <span className={`guide-toc-arrow ${tocOpen ? 'open' : ''}`}>▾</span>
        </button>
        {tocOpen && (
          <div className="guide-toc-mobile-items">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                className={`guide-toc-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => scrollTo(s.id)}
              >
                <span className="guide-toc-emoji">{s.emoji}</span>
                <span className="guide-toc-text">{s.title}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Article Body ── */}
      <article className="guide-article">
        {/* ── Hero / Title ── */}
        <header className="guide-hero">
          <p className="guide-kicker">SIXPM Presents</p>
          <h1 className="guide-title">The Corn & Fire<br />Companion</h1>
          <p className="guide-subtitle">
            A field guide to the taco landscape of Los Angeles — the masa temples, the trompo masters, the regional kingdoms, and the living argument that this city is the greatest taco city on earth.
          </p>
          <div className="guide-byline">
            <span>Written by James Walker</span>
            <span className="guide-byline-sep">·</span>
            <span>March 2026</span>
          </div>
        </header>

        <hr className="guide-divider" />

        {/* ── Section 1: Nixtamal Revolution ── */}
        <section id="nixtamal-revolution" className="guide-section">
          <div className="guide-section-marker"><span>🌽</span></div>
          <h2 className="guide-section-title">The Nixtamal Revolution</h2>

          <p>
            Something fundamental is shifting in Los Angeles, and you can taste it in a tortilla. For decades, most of the city's taquerías relied on industrial masa — corn flour from a bag, mixed with water, pressed flat. It was fine. It was everywhere. It was also a shadow of what a tortilla could be.
          </p>
          <p>
            The process being reclaimed is called <em>nixtamalization</em>, and it is ancient. Dried corn kernels are soaked overnight in an alkaline bath of water and calcium hydroxide — <em>cal</em>, the same mineral the Maya used four thousand years ago. The bath loosens the hull, unlocks niacin that would otherwise pass through your body unused, and cross-links the corn's proteins into something structurally new: a dough that holds together, that bends without breaking, that carries flavor the way a wine glass carries wine.
          </p>
          <p>
            What makes the current moment extraordinary is the specificity. At <R id="komal-molino" data={restaurants}>Komal Molino</R>, in a warehouse space on South Grand Avenue, owner Fátima Juarez adjusts her hydration ratios and lime levels depending on whether she's working with blue, white, or red heirloom corn. Each varietal absorbs differently, releases its starches at a different rate, produces a masa with a distinct personality. Her tortillas supply Michelin-starred restaurants across the city, including <R id="holbox" data={restaurants}>Holbox</R>. The masa is the foundation; everything else is commentary.
          </p>
          <p>
            Over at <R id="ditroit" data={restaurants}>Ditroit</R> in the Arts District, the approach is even more granular. They use <em>maíz criollo</em> — specifically, chalqueño blanco — and they treat their corn varietals the way a natural wine bar treats grape varietals. The tortillas have a lactic tang, almost yogurt-like, with a depth that industrial masa simply cannot produce. Their menu might as well list the strain of corn. This is not hypothetical. It is already happening.
          </p>
          <p>
            The revolution has its quieter temples too. <R id="la-yalaltequita" data={restaurants}>La Yalaltequita</R> on Crenshaw is the Mecinas family's third-generation preservation of Oaxacan <em>blandas</em> — blistered, fragrant tortillas carrying the terroir of the Sierra Norte mountains. <R id="sabys-cafe" data={restaurants}>Saby's Cafe</R> in Mar Vista hand-nixtamalizes small batches of blue corn, producing tortillas with walnut undertones that make you reconsider what a tortilla is even for. And in Boyle Heights, <R id="carnitas-uruapan" data={restaurants}>Carnitas Uruapan</R> still grinds nixtamal on a <em>metate</em> using methods unchanged since the 1960s, while <R id="los-cinco-puntos" data={restaurants}>Los Cinco Puntos</R> gives their corn an overnight alkaline rest that produces an extra-thick, almost chewy tortilla.
          </p>
          <p className="guide-pullquote">
            Think of it as LA's equivalent of the natural wine movement — a return to pre-industrial technique that produces dramatically superior results. Except instead of terroir in a glass, it's terroir folded in half, topped with carne asada, and eaten standing up.
          </p>
        </section>

        <hr className="guide-divider" />

        {/* ── Section 2: Trompo Masters ── */}
        <section id="trompo-masters" className="guide-section">
          <div className="guide-section-marker"><span>🔥</span></div>
          <h2 className="guide-section-title">The Trompo Masters</h2>
          <h3 className="guide-section-subtitle">Al Pastor as Performance Art</h3>

          <p>
            The trompo is a vertical spit — a slowly rotating column of marinated pork, shaved thin, layered and compressed over hours until the whole thing looks like a glistening red-orange pillar. At the top sits a pineapple, caramelizing in the radiant heat. The taquero stands before it with a knife and a tortilla, shaving meat directly into the waiting round of masa with a speed and precision that takes years to develop.
          </p>
          <p>
            This is the most technically demanding street food in the city. And the debate over how to do it right — direct-shave versus plancha-finish — is genuine and fierce.
          </p>
          <p>
            <R id="tacos-la-guera" data={restaurants}>Tacos La Güera</R> on West Pico are champions of the direct-shave method. The meat goes from the trompo to the tortilla without touching a flat-top. The result is what taqueros call the "meat croissant" — translucent, layered slices with charred edges and a moisture profile that plancha-finishing would destroy. The fat renders vertically and stays within the layers. It's architecture, not cooking.
          </p>
          <p>
            Then there is <R id="leos-taco-truck" data={restaurants}>Leo's Taco Truck</R>, which institutionalized what the city calls the "pineapple flick" — the taquero carves a thin disc of pineapple from the crown of the trompo and catches it mid-air on the taco below. It looks like showmanship, and it is, but the chemistry is real: the bromelain enzymes in the pineapple actively tenderize the pork, and the fruit's acidity cuts through the adobo fat. Function disguised as spectacle.
          </p>
          <p>
            <R id="taqueria-frontera" data={restaurants}>Taquería Frontera</R>, ranked number one by multiple outlets, takes a different path entirely. Their tortillas are paper-thin yellow rounds imported from El Grano de Oro tortillería in Tijuana — a Tijuana-LA supply chain for a single ingredient — heated on the plancha to a slight oily crisp. The protein rides on top like a statement. <R id="angels-tijuana-tacos" data={restaurants}>Angel's Tijuana Tacos</R> and <R id="tacos-tamix" data={restaurants}>Tacos Tamix</R> round out the trompo elite, each with their own knife technique and their own answer to the question of what the perfect shave looks like.
          </p>
        </section>

        <hr className="guide-divider" />

        {/* ── Section 3: Regional Kingdoms ── */}
        <section id="regional-kingdoms" className="guide-section">
          <div className="guide-section-marker"><span>🗺️</span></div>
          <h2 className="guide-section-title">Regional Kingdoms</h2>
          <h3 className="guide-section-subtitle">Sonora, Michoacán, and the Border</h3>

          <p>
            The most common mistake outsiders make about LA taco culture is treating it as monolithic. It is not. It is a collection of fierce regional traditions, each carrying the geography and identity of a specific place in Mexico, each operating by its own internal logic.
          </p>
          <p>
            <R id="sonoratown" data={restaurants}>Sonoratown</R> on East 7th Street is the city's ambassador for the Sonoran flour tortilla — paper-thin, sturdy, warm, made from a wheat-flour tradition that traces back to the desert borderlands. Their founders originally drove five hours to the Arizona-Mexico border just to source flour they trusted. They use beef short rib instead of the standard skirt steak for their carne asada, cooked over mesquite. Their salsa roja is a precisely calibrated formula: 34 Roma tomatoes, half an ounce of dried chile de árbol, apple cider vinegar, Mexican dried oregano. It is not improvised. It is engineering.
          </p>
          <p>
            At <R id="villas-tacos" data={restaurants}>Villa's Tacos</R> in Highland Park — a Michelin Bib Gourmand — the tradition is Michoacán. Blue corn tortillas, mesquite-grilled proteins, and what reviewers call the "heavy build": melted Monterey Jack, cotija, sour cream, guacamole. It has been described as a taco "only LA could dream up," and that's the point. Villa's is not Mexico. It is Michoacán as expressed through Highland Park, which is its own kind of authenticity.
          </p>
          <p className="guide-pullquote">
            The flour versus corn debate is a proxy for a deeper story about regional Mexican identity in diaspora. Every restaurant is an embassy.
          </p>
        </section>

        <hr className="guide-divider" />

        {/* ── Section 4: The Specialists ── */}
        <section id="specialists" className="guide-section">
          <div className="guide-section-marker"><span>🥘</span></div>
          <h2 className="guide-section-title">The Specialists</h2>
          <h3 className="guide-section-subtitle">Carnitas, Birria, Barbacoa</h3>

          <p>
            The best taco makers in Los Angeles are obsessives. They focus on a single animal or preparation method, often for generations, and they treat their specialization with the seriousness of a surgeon who only operates on one organ.
          </p>

          <h4 className="guide-subhead">The Cazo de Cobre</h4>
          <p>
            At <R id="carnitas-el-artista" data={restaurants}>Carnitas El Artista</R> in Inglewood, the copper cazo — a massive copper pot — is the instrument. The recipe is four generations old. The physics matter: copper's thermal conductivity ensures uniform temperature across a four-hour lard confit, which means every piece of pork — the <em>maciza</em>, the <em>cueritos</em>, the <em>surtido</em> — renders at the same rate. This is not tradition for tradition's sake. It is precision tooling dressed in the language of heritage.
          </p>
          <p>
            <R id="carnitas-los-gabrieles" data={restaurants}>Carnitas Los Gabrieles</R> in the Piñata District operates an 800-pound capacity sidewalk cazo that produces carnitas with a "sticky" texture impossible to replicate at smaller scale. <R id="metro-balderas" data={restaurants}>Metro Balderas</R> in Highland Park takes the snout-to-tail philosophy literally — their menu includes <em>nana</em> (uterus), snout, and ribs alongside the expected cuts. <R id="tacos-los-guichos" data={restaurants}>Tacos Los Güichos</R> in South Central channels Mexico City street style: <em>trompa</em>, <em>oreja</em>, <em>buche</em>, served without apology.
          </p>

          <h4 className="guide-subhead">The Birria Wars</h4>
          <p>
            <R id="birrieria-familia-castro" data={restaurants}>Birrieria Familia Castro</R> in North Hollywood was named the number one taco spot in America by Yelp in 2025. Their Tijuana-style beef birria uses a closely guarded family recipe, and their <em>vampiros</em> — tortillas griddled until charred and curled like bat wings, a technique borrowed from Sinaloa — are the dish that made them famous.
          </p>
          <p>
            Then there is <R id="goat-mafia" data={restaurants}>Goat Mafia</R>, led by Juan Garcia, who operates as a kind of birria fundamentalist. His position: <em>"Si no es chivo, no es birria."</em> If it's not goat, it's not birria. He uses ginger as an aromatic, adds imperial stout in fall months for a chocolatey depth, and applies culinary school techniques to an ancestral preparation. The tension between beef birria's viral popularity and goat birria's ancestral authenticity is real, and Garcia stands on the goat side of the line with the conviction of a man who has tasted both and made his choice.
          </p>

          <h4 className="guide-subhead">The Underground Pit</h4>
          <p>
            <R id="barbacoa-ramirez" data={restaurants}>Barbacoa Ramirez</R> in Arleta is the single most vertically integrated taco operation in the city. Owner Gonzalo Ramirez raises his own lambs in Central California, butchers them himself, and roasts them for twenty-four hours in a traditional underground pit wrapped in maguey spines. Ranch to pit to table. It is the taco equivalent of a single-estate wine — one person controlling every variable, from the animal's diet to the temperature of the earth.
          </p>
        </section>

        <hr className="guide-divider" />

        {/* ── Section 5: Salsa Architecture ── */}
        <section id="salsa-architecture" className="guide-section">
          <div className="guide-section-marker"><span>🫙</span></div>
          <h2 className="guide-section-title">The Architecture of Salsa</h2>

          <p>
            Salsa is not a condiment. It is structural engineering. Every great salsa is designed to interact with a specific fat profile and texture, the way a mortar is formulated for a specific load-bearing requirement. Get the pairing wrong and you have chaos. Get it right and the whole thing becomes more than the sum of its parts.
          </p>
          <p>
            <strong>Salsa Roja Tatemada</strong> — the roasted red — is the backbone. Chile de árbol, Roma tomatoes, garlic, all charred on a comal until the skins blacken and the Maillard reaction deepens everything into smoky, caramelized complexity. Sonoratown's version is the benchmark. It pairs with carne asada and al pastor because the roasted sweetness cuts through rendered fat without competing with the meat's char.
          </p>
          <p>
            <strong>Salsa Verde</strong> is the acid counterweight. Tomatillos and serrano peppers, simmered until the tomatillo skins just begin to burst — that's the moment. Earlier and you lose the pectin that gives it body; later and the electric acidity flattens into something merely cooked. It exists for carnitas and chicharrón, where you need brightness to cut through pork fat.
          </p>
          <p>
            <strong>Salsa Macha</strong> — dried chiles infused in oil with peanuts or pistachios — is an oil-based salsa designed for seafood. The fat in the oil coats the palate differently than a water-based salsa, creating a richer foundation for delicate proteins. <strong>Aguamole</strong> — avocado, water, lime, salt, whipped — is Tijuana's answer to guacamole, thinner and more acidic, built for speed.
          </p>
          <p className="guide-pullquote">
            The invisible architecture — the thing most people never think about but that separates a good taco from an unforgettable one. Each salsa is engineered for a specific protein the way a wine is paired with a dish.
          </p>
        </section>

        <hr className="guide-divider" />

        {/* ── Section 6: Michelin Recognition ── */}
        <section id="michelin-recognition" className="guide-section">
          <div className="guide-section-marker"><span>⭐</span></div>
          <h2 className="guide-section-title">When Street Food Gets Stars</h2>

          <p>
            Jonathan Gold, who died in 2018, was the first food critic to win a Pulitzer Prize. He spent his entire career arguing — in print, with the force of his considerable intellect and even more considerable appetite — that a taco stand in a gas station parking lot deserved the same critical attention as a French three-star restaurant. That the cook behind the window was an artist. That the food was the thing, not the tablecloth.
          </p>
          <p>
            He did not live to see the Michelin Guide arrive in Los Angeles. But when it did, it proved him right in the most dramatic way possible.
          </p>
          <p>
            <R id="holbox" data={restaurants}>Holbox</R>, inside Mercado La Paloma on South Grand Avenue, became the first Mexican marisquería in the United States to receive a Michelin Star. Their smoked kampachi taco — buttery fish, melted cheese, fresh avocado, all riding on a tortilla made from Komal Molino's hand-nixtamalized masa — is the kind of dish that makes you understand what all the fuss is about. The star went to a restaurant inside a food hall. Gold would have wept.
          </p>
          <p>
            <R id="mariscos-jalisco" data={restaurants}>Mariscos Jalisco</R> in Boyle Heights hasn't changed their taco dorado de camarón in decades, and they don't need to. The corn tortilla filled with a secret shrimp mixture, deep-fried to golden brown, is perennial "Best in Show" at the city's annual Taco Madness tournament. <R id="mariscos-el-chito" data={restaurants}>Mariscos El Chito</R> in El Sereno rounds out the coastal wing — Yelp's number ten nationally — with Baja-style dorados.
          </p>
          <p>
            There is a tension here, and it would be dishonest to ignore it. Michelin stars and Yelp rankings bring lines around the block. They bring attention from people who would not otherwise have found these places. They also change the dynamic — the prices, the crowd, the wait. Whether that is good or bad depends on who you ask. The question is worth asking. The answer is worth sitting with.
          </p>
        </section>

        <hr className="guide-divider" />

        {/* ── Section 7: Taco Madness ── */}
        <section id="taco-madness" className="guide-section">
          <div className="guide-section-marker"><span>🏆</span></div>
          <h2 className="guide-section-title">The Living Tournament</h2>
          <h3 className="guide-section-subtitle">Taco Madness and the Culture of Competition</h3>

          <p>
            Every year, LA stages a bracket-style taco tournament called Taco Madness — think March Madness, but the seedings are based on salsa depth and tortilla integrity instead of free-throw percentage. It is a public referendum on the city's taco hierarchy, and people take it seriously.
          </p>
          <p>
            The 2026 bracket tells a story in matchups. <R id="tacos-los-cholos" data={restaurants}>Tacos Los Cholos</R>, the number one seed, are charcoal grill purists facing off against vegan upstarts. <R id="taqueria-frontera" data={restaurants}>Taquería Frontera</R>, the number three seed, brings Tijuana al pastor tradition against the flauta specialists of Los Dorados LA. And in perhaps the most philosophically charged first-round matchup: <R id="evil-cooks" data={restaurants}>Evil Cooks</R>, the self-described "death metal" innovators, versus <R id="komal-molino" data={restaurants}>Komal Molino</R>, the nixtamal purists. Chaos versus craft. Both are valid. The bracket decides.
          </p>
          <p>
            What makes Taco Madness more than a gimmick is that it creates narratives — tradition versus innovation, regional versus fusion, street versus elevated — and forces them into direct comparison. It is sports journalism applied to food, and it works because Los Angeles cares about its tacos the way other cities care about their baseball teams. Passionately. Irrationally. With deep statistical knowledge and strong opinions about methodology.
          </p>
        </section>

        <hr className="guide-divider guide-divider--final" />

        {/* ── Coda ── */}
        <footer className="guide-coda">
          <p>
            This guide is a living document. Restaurants open, close, change hands, raise their game, lose their edge. The landscape shifts. What doesn't shift is the craft — the four-thousand-year-old alkaline bath, the four-generation copper pot, the overnight underground pit. The techniques outlast the restaurants. The corn outlasts us all.
          </p>
          <p className="guide-updated">Last updated March 2026</p>
        </footer>
      </article>
    </div>
  )
}

export default GuidePage
