import { describe, expect, it } from 'vitest'
import { generatePlans, MAX_PLAN_DISTANCE_MILES } from '../../src/utils/generatePlan.js'

const DATE = '2026-07-17'
const cinemaData = {
  theaters: [
    {
      id: 'vista-theatre',
      name: 'Vista Theatre',
      shortName: 'Vista',
      neighborhood: 'Los Feliz',
      screenings: [
        {
          id: 'screening',
          title: 'The Test',
          date: DATE,
          time: '8:00 pm',
          format: '35mm',
        },
      ],
    },
  ],
}

const nearRestaurant = {
  id: 'near',
  name: 'Near',
  tier: 'feast',
  lat: 34.106,
  lng: -118.282,
  hours: 'Daily 5pm–11pm',
}

describe('generatePlans proximity constraints', () => {
  it('only pairs activities with restaurants inside the hard distance limit', () => {
    const result = generatePlans({
      foodData: {
        restaurants: [
          nearRestaurant,
          { id: 'far', name: 'Far', tier: 'feast', lat: 33.617, lng: -117.929 },
          { id: 'missing-coordinates', name: 'Unknown', tier: 'feast' },
        ],
      },
      cinemaData,
      jazzData: null,
      date: DATE,
    })

    expect(result.planA.restaurant.id).toBe('near')
    expect(result.planA.restaurant.distanceMiles).toBeLessThanOrEqual(MAX_PLAN_DISTANCE_MILES)
  })

  it('returns no plan when every restaurant is distant or missing coordinates', () => {
    const result = generatePlans({
      foodData: {
        restaurants: [
          { id: 'far', name: 'Far', tier: 'feast', lat: 33.617, lng: -117.929 },
          { id: 'missing-coordinates', name: 'Unknown', tier: 'feast' },
        ],
      },
      cinemaData,
      jazzData: null,
      date: DATE,
    })

    expect(result.planA).toBeNull()
  })

  it('rejects an incompatible locked restaurant instead of preserving a bad pairing', () => {
    const result = generatePlans({
      foodData: { restaurants: [nearRestaurant] },
      cinemaData,
      jazzData: null,
      date: DATE,
      locked: {
        planA: {
          restaurant: { id: 'locked-far', name: 'Locked Far', tier: 'feast', lat: 33.617, lng: -117.929 },
        },
      },
    })

    expect(result.planA).toBeNull()
  })

  it('rejects restaurants that are closed or have unknown hours', () => {
    const result = generatePlans({
      foodData: {
        restaurants: [
          { ...nearRestaurant, id: 'closed', hours: 'Daily 8am–5pm' },
          { ...nearRestaurant, id: 'unknown', hours: '' },
        ],
      },
      cinemaData,
      jazzData: null,
      date: DATE,
    })

    expect(result.planA).toBeNull()
  })
})
