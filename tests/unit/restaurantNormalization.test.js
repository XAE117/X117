import { describe, expect, it } from 'vitest'
import { normalizeRestaurantData } from '../../src/hooks/useAppData.js'

describe('normalizeRestaurantData', () => {
  it('bridges scraper and UI fields without mutating fetched data', () => {
    const source = {
      restaurants: [
        {
          id: 'fixture',
          category: 'street',
          price: '$',
          bibGourmand: true,
          fire: 4,
        },
      ],
    }

    const normalized = normalizeRestaurantData(source)
    const restaurant = normalized.restaurants[0]

    expect(restaurant).toMatchObject({
      tier: 'street',
      category: 'street',
      price: '$',
      priceRange: '$',
      michelinStatus: 'bib-gourmand',
      heatScore: 4,
      neighborhood: '',
      cuisine: '',
    })
    expect(normalized.categories.map((category) => category.key)).toContain('pizza')
    expect(source.restaurants[0]).not.toHaveProperty('tier')
  })

  it('handles an absent payload', () => {
    expect(normalizeRestaurantData(null)).toBeNull()
  })
})
