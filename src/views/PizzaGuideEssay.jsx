import { Link } from 'react-router-dom'
import './GuidePage.css'
import './PizzaGuideEssay.css'

function PizzaGuideEssay() {
  return (
    <div className="guide-page pizza-essay">
      {/* Back to listings */}
      <div className="guide-essay-back-wrap">
        <Link to="/food/pizza" className="guide-essay-back-btn">
          ← Pizza Listings
        </Link>
      </div>

      <article className="guide-article">
        <header className="guide-hero">
          <p className="guide-kicker">SIXPM Presents</p>
          <h1 className="guide-title">The Pizza<br />Index</h1>
          <p className="guide-subtitle">
            A curated tour of LA's pizza landscape — the fermentation obsessives, the Japanese-Italian hybrids,
            the Midwest transplants, and the question of whether any of it matters as much as a great crust.
          </p>
          <div className="guide-byline">
            <span>Written by James Walker</span>
            <span className="guide-byline-sep">·</span>
            <span>March 2026</span>
          </div>
        </header>

        <hr className="guide-divider" />

        {/* ── Section 1: The Hybrid ── */}
        <section className="guide-section">
          <div className="guide-section-marker"><span>🏯</span></div>
          <h2 className="guide-section-title">The Tokyo-Neapolitan Convergence</h2>

          <p>
            The most interesting pizza in Los Angeles right now is the product of a cultural collision that shouldn't
            work on paper. Japanese pizzaioli — many of whom trained in Naples, absorbed the Vera Pizza Napoletana
            canon, and then returned home to apply Japanese precision to Italian tradition — began showing up in LA
            over the last decade. What they brought with them is a specific philosophy: the crust is the dish.
            Everything else is garnish.
          </p>
          <p>
            The Tokyo-Neapolitan style is identifiable by its restraint. The leopard spotting on the cornicione —
            the char pattern that signals proper Neapolitan technique — is present, but tighter and more deliberate
            than its Italian counterpart. The toppings are minimal, often single-ingredient, sourced with the same
            obsessive provenance tracking that Tokyo's izakaya culture applies to its protein. The dough is
            typically wetter and more extensible than American Neapolitan, producing a crust that blisters faster
            and collapses into that characteristic Neapolitan sag at the center — the <em>scarpetta</em> that
            Italian purists consider the mark of proper hydration.
          </p>
          <p>
            The neo-Neapolitan variants add a second layer: they take the Neapolitan foundation and push it
            slightly — longer fermentation, different flour blends, an occasional nod to local ingredients —
            without breaking the structural contract. These are not fusion pizzas. They are arguments about what
            Neapolitan pizza becomes when its core principles are applied with even greater rigor.
          </p>
          <p className="guide-pullquote">
            The question these pizzerias are answering is not "how do we make pizza Japanese?" but "what happens
            when Japanese culinary discipline is applied without compromise to an already demanding tradition?"
            The answer is in the crust.
          </p>
        </section>

        <hr className="guide-divider" />

        {/* ── Section 2: Sourdough ── */}
        <section className="guide-section">
          <div className="guide-section-marker"><span>🌾</span></div>
          <h2 className="guide-section-title">The Sourdough Renaissance</h2>
          <h3 className="guide-section-subtitle">Wild Fermentation and the Living Crust</h3>

          <p>
            Before the pandemic made sourdough a cliché, a quieter fermentation movement was already reshaping
            LA's pizza landscape. The practitioners were bakers who had crossed over from bread — naturally
            leavened, long-fermented, with the kind of tang and structural complexity that commercial yeast
            cannot produce regardless of technique.
          </p>
          <p>
            The fundamental difference is time. A commercial-yeast pizza dough ferments in two to four hours.
            A proper sourdough pizza dough ferments for twenty-four to seventy-two hours, during which the wild
            Lactobacillus bacteria produce lactic and acetic acids that develop flavor compounds unavailable in
            faster processes. The result is a crust with a yogurt-like tang, a crumb structure closer to
            bread than flatbread, and a shelf life that actually improves over the first day — the opposite of
            most pizza, which degrades the moment it cools.
          </p>
          <p>
            The best sourdough pizza makers in LA treat their starters as living collaborators. They name them.
            They track ambient temperature effects on fermentation speed. They adjust hydration seasonally.
            The resulting crusts are deeply individual — each pizzeria produces a flavor profile as distinctive
            as a winemaker's house style.
          </p>
        </section>

        <hr className="guide-divider" />

        {/* ── Section 3: Chicago ── */}
        <section className="guide-section">
          <div className="guide-section-marker"><span>🏙️</span></div>
          <h2 className="guide-section-title">The Midwest Transplants</h2>
          <h3 className="guide-section-subtitle">Deep Dish, Tavern-Style, and Detroit's Frico Edge</h3>

          <p>
            Chicago brought two pizza traditions west, and the more interesting one is not the one you've heard of.
          </p>
          <p>
            Deep dish gets the attention — the casserole-depth cornmeal crust, the inverted ingredient order
            (cheese on the bottom, then toppings, then a thick blanket of crushed tomatoes), the fork-and-knife
            experience that Chicagoans defend with the fervor of a constitutional right. In LA it exists primarily
            as a diaspora comfort food, and the best versions are faithful to the Chicago original in ways that
            feel intentionally anachronistic, like a restaurant that serves the food your grandmother made in
            1974 because that's what the food was supposed to taste like.
          </p>
          <p>
            But the sleeper is tavern-style. Chicagoans actually eat tavern-style on a daily basis the way
            New Yorkers eat foldable slices — cracker-thin, square-cut party pizza made for sharing over
            beer, designed to be structural enough to hold a full load of toppings without going floppy.
            The square cut means you get more edge-to-interior ratio, which means more variation in texture
            per bite. In a city that has fallen hard for crispy-bottomed pizza, tavern-style is arguably
            better suited to LA palates than deep dish ever was.
          </p>
          <p>
            Detroit-style arrived in LA with the confidence of a style that knows exactly what it is.
            Blue steel pans. Wisconsin brick cheese pressed to the very edges so it caramelizes against
            the pan into a lacework of crispy, molten frico that curls and darkens at the perimeter.
            Airy, focaccia-like crumb. The sauce goes on last, in two thick stripes across the top —
            a deliberate inversion of every expectation. The result is not a pizza that resembles
            any other pizza. It is its own thing entirely.
          </p>
          <p className="guide-pullquote">
            The frico edge is not an accident and not a garnish. It is the point.
            Every design decision in a Detroit-style pizza exists to create and support that caramelized perimeter.
          </p>
        </section>

        <hr className="guide-divider guide-divider--final" />

        <footer className="guide-coda">
          <p>
            The argument about which pizza is best is the wrong argument. The right argument is about crust —
            specifically, about what kind of relationship the crust has with time and heat and the baker's hands.
            Every great pizza in this city is a great crust first, and a statement about everything else second.
          </p>
          <p className="guide-updated">Last updated March 2026</p>
        </footer>
      </article>
    </div>
  )
}

export default PizzaGuideEssay
