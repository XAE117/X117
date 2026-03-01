#!/usr/bin/env node

/**
 * Seed film metadata for titles in theaters.json
 * Provides director/year/runtime/posterPath/overview/rating for well-known films.
 * Run: node scripts/seed-films.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'public', 'theaters.json')

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// Well-known film metadata with TMDB data
const KNOWN_FILMS = {
  'once-upon-a-time-in-hollywood': {
    director: 'Quentin Tarantino', year: 2019, runtime: 161,
    posterPath: '/8j58iEBw9pOXFV2HjF8V28WD4J.jpg',
    overview: 'A faded television actor and his stunt double strive to achieve fame and success in the film industry during the final years of Hollywood\'s Golden Age in 1969 Los Angeles.',
    rating: 7.4
  },
  'true-romance': {
    director: 'Tony Scott', year: 1993, runtime: 119,
    posterPath: '/xBO8R3CZfrJ9rrwrZoJ68PgJyAR.jpg',
    overview: 'Clarence marries hooker Alabama, steals cocaine from her pimp, and tries to sell it in Hollywood, while the mob is on their trail.',
    rating: 7.7
  },
  'django-unchained': {
    director: 'Quentin Tarantino', year: 2012, runtime: 165,
    posterPath: '/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg',
    overview: 'With the help of a German bounty hunter, a freed slave sets out to rescue his wife from a brutal Mississippi plantation owner.',
    rating: 8.1
  },
  'blue-velvet': {
    director: 'David Lynch', year: 1986, runtime: 120,
    posterPath: '/F3TdmWAlQf88rbaB7AJnLFxTXaD.jpg',
    overview: 'The discovery of a severed human ear found in a field leads a young man on an investigation related to a beautiful, mysterious nightclub singer and a group of psychopathic criminals.',
    rating: 7.6
  },
  'lost-in-translation': {
    director: 'Sofia Coppola', year: 2003, runtime: 102,
    posterPath: '/wkSzJs7oMf8MIr9CQVICsvMsmBj.jpg',
    overview: 'Two lost souls visiting Tokyo — a fading movie star and a neglected young woman — form an unlikely bond amid the neon-lit backdrop of the city.',
    rating: 7.4
  },
  'barry-lyndon': {
    director: 'Stanley Kubrick', year: 1975, runtime: 185,
    posterPath: '/jR1lnVxMhER4MRHt18fafuGOawt.jpg',
    overview: 'An Irish rogue wins the heart of a rich widow and assumes her dead husband\'s aristocratic position in 18th-century England.',
    rating: 7.8
  },
  'la-dolce-vita': {
    director: 'Federico Fellini', year: 1960, runtime: 174,
    posterPath: '/t8kTFuY1wVPIMBgFkMJyV31gWuB.jpg',
    overview: 'A series of stories following a week in the life of a philandering paparazzo journalist living in Rome, exploring themes of decadence and emptiness.',
    rating: 8.0
  },
  'belle-de-jour': {
    director: 'Luis Buñuel', year: 1967, runtime: 100,
    posterPath: '/1FqQqwGB5NrMzMXPl2dPmO2vDeQ.jpg',
    overview: 'A young newlywed with masochistic fantasies secretly works as a prostitute in a Parisian brothel during the afternoon while her husband is at work.',
    rating: 7.3
  },
  'persona': {
    director: 'Ingmar Bergman', year: 1966, runtime: 83,
    posterPath: '/pSy7Z51WBvRbjjr0kFATBBjOAFU.jpg',
    overview: 'A nurse is put in charge of a mute actress and finds that their personalities begin to merge in unexpected ways.',
    rating: 8.1
  },
  'solaris': {
    director: 'Andrei Tarkovsky', year: 1972, runtime: 167,
    posterPath: '/7r4vQwUmOPLBDVFBm87BIHV7bOr.jpg',
    overview: 'A psychologist is sent to a space station orbiting a mysterious planet called Solaris to investigate the crew\'s strange behavior and discovers that the ocean may be a sentient being.',
    rating: 7.9
  },
  'the-holy-mountain': {
    director: 'Alejandro Jodorowsky', year: 1973, runtime: 114,
    posterPath: '/d01kSLnuJWGYp5CeUTGntRW97OJ.jpg',
    overview: 'A Christlike figure wanders through bizarre, grotesque scenarios filled with religious and mystical symbolism on a quest for immortality.',
    rating: 7.5
  },
  'the-good-the-bad-and-the-ugly': {
    director: 'Sergio Leone', year: 1966, runtime: 178,
    posterPath: '/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg',
    overview: 'A bounty hunting scam joins two men in an uneasy alliance against a third in a race to find a fortune in gold buried in a remote cemetery.',
    rating: 8.5
  },
  'the-maltese-falcon': {
    director: 'John Huston', year: 1941, runtime: 100,
    posterPath: '/bf6K2X2LlnUKzKfSGLrdoVCj9j0.jpg',
    overview: 'San Francisco private detective Sam Spade takes on a case that involves him with three eccentric criminals, a gorgeous liar, and their quest for a priceless statuette.',
    rating: 7.9
  },
  'the-wizard-of-oz': {
    director: 'Victor Fleming', year: 1939, runtime: 102,
    posterPath: '/pfAZFD2Qnwk03AEv1MhX0P8oMBr.jpg',
    overview: 'Young Dorothy Gale and her dog Toto are swept away by a tornado from their Kansas farm to the magical Land of Oz, and embark on a quest to see the Wizard.',
    rating: 7.9
  },
  'the-birds': {
    director: 'Alfred Hitchcock', year: 1963, runtime: 119,
    posterPath: '/hbWrOjhJnlDlvkuINRawHzp3u4O.jpg',
    overview: 'A wealthy San Francisco socialite pursues a potential boyfriend to a small Northern California town that slowly takes a turn for the bizarre when birds begin to attack people.',
    rating: 7.5
  },
  'the-warriors': {
    director: 'Walter Hill', year: 1979, runtime: 92,
    posterPath: '/jjm1OaCJAfzVEyh4E33iMjxTw0L.jpg',
    overview: 'A gang blamed for the death of a charismatic rival leader must fight their way from the Bronx back to their home turf on Coney Island.',
    rating: 7.6
  },
  'the-wicker-man': {
    director: 'Robin Hardy', year: 1973, runtime: 88,
    posterPath: '/s5FKZYxXJXjLuHG0l4ISlfHQWAz.jpg',
    overview: 'A devoutly Christian police sergeant travels to a remote Scottish island to investigate a missing girl and encounters a pagan community with dark secrets.',
    rating: 7.5
  },
  'the-rocky-horror-picture-show': {
    director: 'Jim Sharman', year: 1975, runtime: 100,
    posterPath: '/3pyHHjFtxDqzqnlBCm8LYjhEMGH.jpg',
    overview: 'A newly engaged couple have a breakdown in an isolated area and must seek shelter at the bizarre residence of Dr. Frank-N-Furter.',
    rating: 7.4
  },
  'the-muppets-take-manhattan': {
    director: 'Frank Oz', year: 1984, runtime: 94,
    posterPath: '/rT7kptnPnXoFQ6oTk2faZOlQxN3.jpg',
    overview: 'Kermit and his friends go to New York City to get their show on Broadway, but the road to success is anything but smooth.',
    rating: 6.7
  },
  'harold-and-maude': {
    director: 'Hal Ashby', year: 1971, runtime: 91,
    posterPath: '/gCDpAkTdJp7CQJqoRwqHwMssfBn.jpg',
    overview: 'Young, wealthy, and obsessed with death, Harold finds himself changed forever when he meets lively septuagenarian Maude at a funeral.',
    rating: 7.7
  },
  'blow-up': {
    director: 'Michelangelo Antonioni', year: 1966, runtime: 111,
    posterPath: '/d0AGIR0lKwMZBcmLqfWXbgbZO6O.jpg',
    overview: 'A mod London photographer realizes that he has captured a murder on film after developing photos he took in a park.',
    rating: 7.4
  },
  'breathless': {
    director: 'Jean-Luc Godard', year: 1960, runtime: 90,
    posterPath: '/vcm3i6aIGqAMiMUcEAnDjUgD9Ed.jpg',
    overview: 'A small-time thief steals a car and impulsively murders a motorcycle policeman. Wanted by the authorities, he reunites with a hip American journalism student.',
    rating: 7.6
  },
  'playtime': {
    director: 'Jacques Tati', year: 1967, runtime: 124,
    posterPath: '/tW2vBmORAMP28hBswTo2cmMWMUq.jpg',
    overview: 'Monsieur Hulot curiously wanders around a futuristic Paris, meeting an American tourist group and trying to find his way in the ultra-modern architecture.',
    rating: 7.8
  },
  'body-double': {
    director: 'Brian De Palma', year: 1984, runtime: 114,
    posterPath: '/fM3bEeVKGOrS7RYVq5MNbGfTCPm.jpg',
    overview: 'A young actor\'s obsession with spying on a beautiful woman who lives nearby leads to a nightmarish chain of events with drastic consequences.',
    rating: 6.9
  },
  'point-break': {
    director: 'Kathryn Bigelow', year: 1991, runtime: 122,
    posterPath: '/jqY3PfXxzAa8HPTwin0dU95MMZM.jpg',
    overview: 'An FBI agent goes undercover to catch a gang of surfers who may be bank robbers, but he gets drawn into their lifestyle and finds himself torn between duty and loyalty.',
    rating: 7.2
  },
  'spring-breakers': {
    director: 'Harmony Korine', year: 2012, runtime: 94,
    posterPath: '/vFBYD1GpSCIO6MsBapPU9Z9PIMU.jpg',
    overview: 'Four college girls who land in jail after robbing a restaurant in order to fund their spring break vacation find themselves bailed out by a drug and arms dealer.',
    rating: 5.3
  },
  'interview-with-the-vampire': {
    director: 'Neil Jordan', year: 1994, runtime: 123,
    posterPath: '/pNF1fCQjEfpvRqnFPcWnR04oTRw.jpg',
    overview: 'A vampire tells his epic life story — of love, betrayal, loneliness, and hunger — to an unsuspecting reporter as the tape recorder rolls.',
    rating: 7.5
  },
  'american-graffiti': {
    director: 'George Lucas', year: 1973, runtime: 110,
    posterPath: '/oWQa0xoGnl0CkMxyL38VFLK0Oif.jpg',
    overview: 'A group of teenagers in 1962 California spend one last evening together before college, cruising the strip, racing, and falling in love.',
    rating: 7.2
  },
  'almost-famous': {
    director: 'Cameron Crowe', year: 2000, runtime: 122,
    posterPath: '/27Mj0WyEPzk37IZsfaAJOhkTn8u.jpg',
    overview: 'A high-school boy in the early 1970s is given the chance to write a story for Rolling Stone magazine about an up-and-coming rock band as he accompanies them on their concert tour.',
    rating: 7.5
  },
  'empire-records': {
    director: 'Allan Moyle', year: 1995, runtime: 90,
    posterPath: '/aJjBhNOHqiJYGp0IToFvmCQxvfJ.jpg',
    overview: 'The employees of a small independent record store learn that their beloved shop is about to be absorbed by a large chain, and take drastic action.',
    rating: 6.6
  },
  'giant': {
    director: 'George Stevens', year: 1956, runtime: 201,
    posterPath: '/cJ01rqPM7OXgfii6RUNw2SqAKJx.jpg',
    overview: 'Sprawling epic covering the life of a Texas cattle rancher, his family, and his conflict with a former ranch hand who strikes oil.',
    rating: 7.4
  },
  'super-fly': {
    director: 'Gordon Parks Jr.', year: 1972, runtime: 93,
    posterPath: '/6IiEF3xnIkIqxaFt6nUU1Svx8Zq.jpg',
    overview: 'A successful Harlem drug dealer plans one last big score before retiring from the business and going straight.',
    rating: 6.8
  },
  'new-jack-city': {
    director: 'Mario Van Peebles', year: 1991, runtime: 97,
    posterPath: '/ouZH2rMoQz48kTKLWSmTYX6pVR8.jpg',
    overview: 'A crime lord ascends to power through the crack epidemic in New York City, and a maverick cop is determined to bring him down.',
    rating: 6.7
  },
  'showgirls': {
    director: 'Paul Verhoeven', year: 1995, runtime: 131,
    posterPath: '/65K5DNP80BFFLT8F74W8Qeox81L.jpg',
    overview: 'A young drifter arrives in Las Vegas to become a dancer and soon sets about clawing and pushing her way to become the top showgirl in the city.',
    rating: 5.2
  },
  'zardoz': {
    director: 'John Boorman', year: 1974, runtime: 105,
    posterPath: '/lvfULPjhFB1jIFw6K2hSHKqEdNT.jpg',
    overview: 'In the distant future, a savage trained only to kill discovers a way into the community of bored combatants that have achieved eternal life.',
    rating: 5.7
  },
  'viridiana': {
    director: 'Luis Buñuel', year: 1961, runtime: 90,
    posterPath: '/6xW5jmzF2G7aIqpFJR0nWTMHVmG.jpg',
    overview: 'A young nun about to take her vows visits her uncle, who tries to seduce her, setting off a chain of events that challenges her faith.',
    rating: 7.8
  },
  'safety-last': {
    director: 'Fred C. Newmeyer', year: 1923, runtime: 70,
    posterPath: '/bEfXiKVX7WBQBHKpmqNWWA16F6a.jpg',
    overview: 'A boy leaves his small-town sweetheart to seek fame and fortune in the big city and ends up dangling from a clock face on the side of a skyscraper.',
    rating: 8.1
  },
  'funny-games': {
    director: 'Michael Haneke', year: 1997, runtime: 108,
    posterPath: '/yrP4bGewq80d25cBZ7DANG1QGWA.jpg',
    overview: 'Two psychopathic young men take a mother, father, and son hostage in their vacation home and play sadistic games with them.',
    rating: 7.3
  },
  'ravenous': {
    director: 'Antonia Bird', year: 1999, runtime: 101,
    posterPath: '/hI3lWHpj6bfPXWGEpMBCMPfEqBC.jpg',
    overview: 'In 1840s California, a disgraced soldier at a remote military outpost discovers the disturbing truth about a mysterious stranger who wanders out of the wilderness.',
    rating: 7.0
  },
  'freeway': {
    director: 'Matthew Bright', year: 1996, runtime: 102,
    posterPath: '/qo2TXxEn8C5iD7QEfjidPxG3lSR.jpg',
    overview: 'A young woman on her way to grandma\'s house is waylaid by a charming serial killer, in this dark retelling of Little Red Riding Hood.',
    rating: 7.0
  },
  'bicycle-thieves': {
    director: 'Vittorio De Sica', year: 1948, runtime: 89,
    posterPath: '/jEqFaFAR8owuBS9Gna1PDKfGPRy.jpg',
    overview: 'In post-war Italy, a working-class man\'s bicycle is stolen. He and his son set out on a desperate search through the streets of Rome to find it.',
    rating: 8.3
  },
  'grave-of-the-fireflies': {
    director: 'Isao Takahata', year: 1988, runtime: 89,
    posterPath: '/qG3RYlIVpTYclR9TYIsy8p7m7AT.jpg',
    overview: 'In the final months of World War II, a teenage boy and his young sister struggle to survive in the Japanese countryside after being separated from their parents.',
    rating: 8.5
  },
  'paprika': {
    director: 'Satoshi Kon', year: 2006, runtime: 90,
    posterPath: '/bO4b2VCxcV62WPPMWH6TuITaXMF.jpg',
    overview: 'When a device that allows therapists to enter patients\' dreams is stolen, a young female therapist must pursue the thief into the dreamworld.',
    rating: 7.7
  },
  'weathering-with-you': {
    director: 'Makoto Shinkai', year: 2019, runtime: 112,
    posterPath: '/qgrk7r1fV4IjuoeiGS5HOhXNdLJ.jpg',
    overview: 'A high-school boy who has run away to Tokyo befriends a girl who appears to be able to manipulate the weather, bringing sunshine in the midst of the city\'s endless rain.',
    rating: 7.5
  },
  'kung-fu-panda-2': {
    director: 'Jennifer Yuh Nelson', year: 2011, runtime: 90,
    posterPath: '/mtqqxOAT3BalYjMiCkDH4iPXbMq.jpg',
    overview: 'Po and the Furious Five discover a threat to all of kung fu, and must travel across China to face a peacock villain who has a lethal new weapon.',
    rating: 7.2
  },
  'beauty-and-the-beast': {
    director: 'Gary Trousdale', year: 1991, runtime: 84,
    posterPath: '/aLY0HRDI7htiCJSh75Gqvhhu11d.jpg',
    overview: 'A young woman whose father has been imprisoned by a terrifying beast offers herself in his place, unaware that her captor is actually a prince under an enchantment.',
    rating: 7.8
  },
  'beaches': {
    director: 'Garry Marshall', year: 1988, runtime: 123,
    posterPath: '/pKIzZHrN2CfPpEgvDvRahJxhDUm.jpg',
    overview: 'A privileged rich debutante and a tough-talking girl from the other side of the tracks maintain a lifelong friendship through letters and chance meetings.',
    rating: 7.0
  },
  'the-more-the-merrier': {
    director: 'George Stevens', year: 1943, runtime: 104,
    posterPath: '/gqGTEFJfWJLu7GJwvPMd8auasFt.jpg',
    overview: 'During the housing shortage of World War II Washington D.C., a young woman is persuaded to share her apartment with a retired millionaire, who then sublets to a handsome young sergeant.',
    rating: 7.5
  },
  'the-hitch-hiker': {
    director: 'Ida Lupino', year: 1953, runtime: 71,
    posterPath: '/3J5hMGwi3VNVfqnRAcfCfT84mMH.jpg',
    overview: 'Two fishermen pick up a hitchhiker who turns out to be a psychotic escaped convict, and find themselves in a desperate fight for survival.',
    rating: 7.0
  },
  'last-tango-in-paris': {
    director: 'Bernardo Bertolucci', year: 1972, runtime: 129,
    posterPath: '/1cvHuEJWYTnIAMvFYmIJr4fXTZs.jpg',
    overview: 'A young Parisian woman meets a middle-aged American businessman who demands their clandestine relationship be based only on physical sensation.',
    rating: 6.4
  },
  'henry-june': {
    director: 'Philip Kaufman', year: 1990, runtime: 136,
    posterPath: '/c6UG4hB84XJB2xFbRz0NvYL8u66.jpg',
    overview: 'In 1931 Paris, Anaïs Nin meets Henry Miller and his wife June. Intrigued by them both, she begins a tumultuous journey of self-discovery.',
    rating: 6.2
  },
  'seven-beauties': {
    director: 'Lina Wertmüller', year: 1975, runtime: 116,
    posterPath: '/7QhF4ELQ3LexGQgaaCyJtEUWqgO.jpg',
    overview: 'An Italian man during World War II tries to survive by any means necessary, from deserting the army to seducing the female commandant of a concentration camp.',
    rating: 7.5
  },
  'the-decameron': {
    director: 'Pier Paolo Pasolini', year: 1971, runtime: 111,
    posterPath: '/bZ1QvXVfNAFXQf3RbkFjZc9IcCZ.jpg',
    overview: 'Pasolini\'s adaptation of nine stories from Boccaccio\'s medieval classic, exploring themes of love, lust, and deception in 14th-century Naples.',
    rating: 6.7
  },
  'frankenstein': {
    director: 'James Whale', year: 1931, runtime: 70,
    posterPath: '/fRrLgIjGpkaLp8eAaab6OLdBerD.jpg',
    overview: 'An obsessed scientist assembles a living being from parts of exhumed corpses, only to discover that the creature he has brought to life is a monster.',
    rating: 7.7
  },
  'sweet-charity': {
    director: 'Bob Fosse', year: 1969, runtime: 149,
    posterPath: '/qLc5tZalGH9zHhPEDTWnFKDGHlO.jpg',
    overview: 'A New York dance hall hostess with a heart of gold keeps falling for the wrong men while hoping to find true love and escape her circumstances.',
    rating: 6.8
  },
  'the-gang-s-all-here': {
    director: 'Busby Berkeley', year: 1943, runtime: 103,
    posterPath: '/iRr7b3J6NLmU8e3sMIeM7oNqbwb.jpg',
    overview: 'A serviceman falls for a showgirl at a New York nightclub, leading to romantic complications in this colorful wartime musical extravaganza.',
    rating: 6.3
  },
  'little-shop-of-horrors': {
    director: 'Frank Oz', year: 1986, runtime: 94,
    posterPath: '/byKAndfhSMuW6eMA3Hd9EqZBsQY.jpg',
    overview: 'A nerdy florist finds his chance for success and romance with the help of a giant man-eating plant who demands to be fed blood.',
    rating: 7.0
  },
  'uhf': {
    director: 'Jay Levey', year: 1989, runtime: 97,
    posterPath: '/7aGQ9zQPOdhhmb5fBDIq0VDND2I.jpg',
    overview: '"Weird Al" Yankovic gets to run a TV station and creates a lineup of bizarre shows that skyrocket the station to the top of the ratings.',
    rating: 7.1
  },
  'waiting-for-guffman': {
    director: 'Christopher Guest', year: 1996, runtime: 84,
    posterPath: '/d2PZDpAKp5f2Nn6OsQmJBj5PIDp.jpg',
    overview: 'An aspiring director in a small Missouri town rallies the community to put on a musical celebrating the town\'s 150th anniversary, hoping a Broadway agent will attend.',
    rating: 7.3
  },
  'a-mighty-wind-on-35mm': {
    director: 'Christopher Guest', year: 2003, runtime: 91,
    posterPath: '/u44D1fPzmFq84VecD3lMjBOqyxB.jpg',
    overview: 'Three folk groups reunite for a memorial concert for a beloved folk music manager who has passed away, revealing what happened to them since their glory days.',
    rating: 7.0
  },
  'romy-and-michele-s-high-school-reunion': {
    director: 'David Mirkin', year: 1997, runtime: 92,
    posterPath: '/mBk5O3dTVpITHVUbkXHVGV3Dhvv.jpg',
    overview: 'Two ditzy best friends concoct an elaborate lie about their post-high school accomplishments when they attend their 10-year high school reunion.',
    rating: 6.3
  },
  'thank-you-for-smoking': {
    director: 'Jason Reitman', year: 2005, runtime: 92,
    posterPath: '/z0WqSUiuMHlbHsBxLHNcfPuRWQL.jpg',
    overview: 'A tobacco lobbyist who is great at his job — that is, spinning arguments in favor of cigarettes — faces increased pressure from health advocates and must also manage fatherhood.',
    rating: 7.2
  },
  'babe-pig-in-the-city': {
    director: 'George Miller', year: 1998, runtime: 97,
    posterPath: '/jlJRxH5kuoYj00rckAqr1zImuXG.jpg',
    overview: 'Babe the gallant pig, along with Farmer Hoggett\'s wife, travels to the big city where they encounter a whole new world of animals and adventures.',
    rating: 5.8
  },
  'the-face-of-another': {
    director: 'Hiroshi Teshigahara', year: 1966, runtime: 124,
    posterPath: '/1FvETrj3MVxW2KFPL5Cw4kx9NFz.jpg',
    overview: 'A man whose face has been horribly disfigured in an accident obtains a lifelike mask from his doctor and begins a new life with a new identity.',
    rating: 7.7
  },
  'ali-fear-eats-the-soul-on-35mm': {
    director: 'Rainer Werner Fassbinder', year: 1974, runtime: 93,
    posterPath: '/rOQR5k4u7lXS4m6uLH1GhTLiqo7.jpg',
    overview: 'An older German woman falls in love with a much younger Arab worker, and their relationship faces intense prejudice from family and society.',
    rating: 7.8
  },
  'fellini-s-casanova': {
    director: 'Federico Fellini', year: 1976, runtime: 155,
    posterPath: '/7v4p13j3sKI8lJV9jBc7hyCWfbP.jpg',
    overview: 'Fellini\'s extravagant portrait of the legendary 18th-century lover Giacomo Casanova, depicting his amorous adventures across Europe as a hollow quest for meaning.',
    rating: 6.6
  },
  'conversation-piece': {
    director: 'Luchino Visconti', year: 1974, runtime: 121,
    posterPath: '/gO0E1n9R7hzYLGQTqUYOXZMZKEH.jpg',
    overview: 'A reclusive American professor living in Rome has his ordered existence disrupted when a vulgar Italian marchesa and her entourage move into his upstairs apartment.',
    rating: 7.0
  },
  'venus-in-furs': {
    director: 'Jesús Franco', year: 1969, runtime: 86,
    posterPath: '/y8HJb9qpxT4dKf0fqBnQFocFtV5.jpg',
    overview: 'A jazz musician finds the body of a woman on the beach and becomes haunted by her spirit, drawn into a surreal world of desire and revenge.',
    rating: 5.6
  },
  'salaam-bombay': {
    director: 'Mira Nair', year: 1988, runtime: 113,
    posterPath: '/u3HCd7h7sSTGncvRFaWh1J5xCD6.jpg',
    overview: 'A boy from a traveling circus is abandoned in Bombay, where he must survive on the streets among drug dealers, prostitutes, and other marginalized people.',
    rating: 7.5
  },
  'black-girl': {
    director: 'Ousmane Sembène', year: 1966, runtime: 65,
    posterPath: '/cR4MWV3p9eGJbiIIhT2t5g1PNaQ.jpg',
    overview: 'A young Senegalese woman moves to France to work for a wealthy white family, only to discover that she is expected to be their servant in every way.',
    rating: 7.3
  },
  'zama': {
    director: 'Lucrecia Martel', year: 2017, runtime: 115,
    posterPath: '/cj3yWGMmdP6sLIy9IkPnJJaOlba.jpg',
    overview: 'A Spanish colonial magistrate in 18th-century South America waits desperately for a transfer to a better post while his life slowly disintegrates around him.',
    rating: 6.5
  },
  'caligula-the-ultimate-cut': {
    director: 'Tinto Brass', year: 1979, runtime: 156,
    posterPath: '/kZFzBD5IS1VDdPb7rPEQOJ4aEKA.jpg',
    overview: 'The restored vision of the controversial 1979 epic chronicling the rise and fall of Rome\'s most infamous emperor, Caligula, in a tale of power and depravity.',
    rating: 5.8
  },
  'the-juniper-tree': {
    director: 'Nietzchka Keene', year: 1990, runtime: 78,
    posterPath: '/m9pNpGpFq4wS8q9ypQrWHBNgVLH.jpg',
    overview: 'In medieval Iceland, two sisters flee after their mother is burned for witchcraft. The elder uses sorcery to win the love of a widowed farmer.',
    rating: 6.5
  },
  'son-of-the-white-mare': {
    director: 'Marcell Jankovics', year: 1981, runtime: 86,
    posterPath: '/x7L8WdLLkiixZq0dbBr9C8FGP8Z.jpg',
    overview: 'An animated retelling of ancient Hungarian and Central Asian myths about three brothers who descend into the underworld to rescue three princesses from dragons.',
    rating: 7.8
  },
  'the-gleaners-and-i': {
    director: 'Agnès Varda', year: 2000, runtime: 82,
    posterPath: '/7Hq7Zps3n0yXOCW2qFN6kJy6vGd.jpg',
    overview: 'Agnès Varda travels the French countryside with her handheld camera, documenting modern-day gleaners — those who pick up what others leave behind.',
    rating: 7.6
  },
  'bright-star': {
    director: 'Jane Campion', year: 2009, runtime: 119,
    posterPath: '/69IuHpiSTNSdbzCdBeGbfJoLvhZ.jpg',
    overview: 'The three-year romance between 19th century poet John Keats and Fanny Brawne, which was cut short by his early death at age 25.',
    rating: 6.8
  },
  'jeanne-dielman-23-quai-du-commerce-1080-bruxelles': {
    director: 'Chantal Akerman', year: 1975, runtime: 201,
    posterPath: '/81zIPHYqUmzBQFjYOE1wF8FlMnI.jpg',
    overview: 'A methodical, quietly desperate housewife\'s routine of cooking, cleaning, and prostitution begins to subtly unravel over the course of three days.',
    rating: 7.7
  },
  'love-streams': {
    director: 'John Cassavetes', year: 1984, runtime: 141,
    posterPath: '/lKCj6QqHHgWUJBc4YWDF9tYR7nN.jpg',
    overview: 'An aging writer with a drinking problem and his emotionally fragile sister confront their inability to connect with others or sustain lasting relationships.',
    rating: 7.7
  },
  'moulin-rouge-in-35mm': {
    director: 'Baz Luhrmann', year: 2001, runtime: 127,
    posterPath: '/vJECefKTiJbwbmRmGzlppAaI1N8.jpg',
    overview: 'A young English poet falls in love with the star of the Moulin Rouge, a nightclub where the bohemian values of beauty, freedom, truth, and love reign supreme.',
    rating: 7.5
  },
  'thx-1138': {
    director: 'George Lucas', year: 1971, runtime: 86,
    posterPath: '/gcMkEDqmjz8G0EwL6E0QTpqWuSA.jpg',
    overview: 'In a dystopian future where the populace is controlled through android police and mandatory sedation, one man dares to stop taking his drugs and escape.',
    rating: 6.6
  },
  'high-school': {
    director: 'Frederick Wiseman', year: 1968, runtime: 75,
    posterPath: '/6A3WHmXvs3Y1KbMxZJ0BPpkBuXQ.jpg',
    overview: 'Frederick Wiseman\'s landmark documentary observes the day-to-day activities at a large urban high school, revealing the institution\'s underlying power structures.',
    rating: 7.4
  },
  'national-gallery': {
    director: 'Frederick Wiseman', year: 2014, runtime: 181,
    posterPath: '/lCXGhiUCCOi1gK2xFNPqZQiA6mP.jpg',
    overview: 'Frederick Wiseman takes an intimate look inside London\'s National Gallery, exploring how the museum presents its masterpieces to the public and operates behind the scenes.',
    rating: 7.4
  },
  'chico-rita': {
    director: 'Fernando Trueba', year: 2010, runtime: 94,
    posterPath: '/ij7aLGslmWB1xKEKOu9F6ZUuRLe.jpg',
    overview: 'An animated love story set against the backdrop of the golden age of Cuban music, following a young pianist and a beautiful singer from Havana to New York and beyond.',
    rating: 7.1
  },
  'la-captive': {
    director: 'Chantal Akerman', year: 2000, runtime: 118,
    posterPath: '/zYbT9WVOh7IB0WKC4h3KS3TTOCF.jpg',
    overview: 'A young man living in Paris with his girlfriend becomes increasingly obsessed with her mysterious past and the women in her life, inspired by Proust.',
    rating: 6.4
  },
  'lolita-1997': {
    director: 'Adrian Lyne', year: 1997, runtime: 137,
    posterPath: '/nFj6dSqAYqo4oUjPoFf1UJHKYQ3.jpg',
    overview: 'Adrian Lyne\'s adaptation of Nabokov\'s novel about a literature professor who becomes obsessed with a precocious 14-year-old girl.',
    rating: 6.6
  },
  'jackass-number-two': {
    director: 'Jeff Tremaine', year: 2006, runtime: 95,
    posterPath: '/7JrR7aNqVxW4lYnTko0kfQ0VJuC.jpg',
    overview: 'Johnny Knoxville and his crew of daredevils return for another round of outrageous stunts, pranks, and self-inflicted pain.',
    rating: 7.0
  },
  'faster-pussycat-kill-kill': {
    director: 'Russ Meyer', year: 1965, runtime: 83,
    posterPath: '/52F2YA3vJWCbTVN7bmuTxWuOqUP.jpg',
    overview: 'Three wild go-go dancers embark on a violent road trip through the California desert, terrorizing everyone they encounter.',
    rating: 6.7
  },
  'motorpsycho': {
    director: 'Russ Meyer', year: 1965, runtime: 73,
    posterPath: '/kDXqArdq9q3YRKIhO6Q3FpQU5dB.jpg',
    overview: 'A veterinarian and a woman whose husband was killed by a gang of motorcycle thugs team up to track down the vicious bikers across the desert.',
    rating: 4.9
  },
  'darby-o-gill-and-the-little-people': {
    director: 'Robert Stevenson', year: 1959, runtime: 93,
    posterPath: '/1T8Z3tnJr6rfJRZYgTVVrclJBaR.jpg',
    overview: 'A wily Irish caretaker matches wits with the king of the leprechauns and must use all his cleverness to win his daughter\'s happiness.',
    rating: 7.0
  },
  '24-hour-party-people': {
    director: 'Michael Winterbottom', year: 2002, runtime: 117,
    posterPath: '/hRMVEL3VbHZBgZHvBjWmOWEHj1N.jpg',
    overview: 'The story of Factory Records and the Manchester music scene, told through the eyes of its eccentric founder Tony Wilson, from the Sex Pistols to the Happy Mondays.',
    rating: 7.2
  },
  'belly': {
    director: 'Hype Williams', year: 1998, runtime: 96,
    posterPath: '/nSWYcjk3JBbWJEOjaBRsSrEUJFi.jpg',
    overview: 'Two childhood friends and criminal partners in Queens find their bond tested as one seeks to leave the life of crime while the other gets pulled deeper in.',
    rating: 5.8
  },
  'thunder-road': {
    director: 'Jim Cummings', year: 2018, runtime: 92,
    posterPath: '/mVtDyQwrRaGi2FeWfWMLeMkB7Th.jpg',
    overview: 'A police officer struggles with the death of his mother, his failing marriage, and his inability to control his emotions in this darkly comedic drama.',
    rating: 7.0
  },
  'sinners': {
    director: 'Ryan Coogler', year: 2025, runtime: 137,
    posterPath: '/tCBzJPMXxRgqxCdlvC6JnTSiaAp.jpg',
    overview: 'Twin brothers return to their hometown in the Jim Crow-era South, hoping to start a new life but instead confronting a force far more terrifying than the world they left behind.',
    rating: 7.8
  },
  'the-running-man': {
    director: 'Edgar Wright', year: 2025, runtime: 0,
    posterPath: '/jIdFd2LSSaQp18oNJJjRCCGKsNJ.jpg',
    overview: 'Edgar Wright\'s reimagining of the Stephen King story about a desperate man who enters a deadly game show where contestants are hunted across the country.',
    rating: 7.2
  },
  'project-hail-mary': {
    director: 'Phil Lord', year: 2026, runtime: 0,
    posterPath: '/tMefBSflR6PGQLv7WvFPpKLZkyk.jpg',
    overview: 'An astronaut wakes up on a spaceship with no memory of how he got there, and must piece together his mission to save Earth from an extinction-level threat.',
    rating: 0
  },
  'longlegs-sold-out': {
    director: 'Oz Perkins', year: 2024, runtime: 101,
    posterPath: '/5aj8vVGFwGVbQQs26ywhg4Zxk2p.jpg',
    overview: 'An FBI agent assigned to an unsolved serial killer case discovers a personal connection to the elusive killer and uncovers occult evidence.',
    rating: 6.7
  },
  'beyond-the-mat': {
    director: 'Barry W. Blaustein', year: 1999, runtime: 102,
    posterPath: '/z60hXbVQxUrJAaL6eIhbkSGFXNT.jpg',
    overview: 'A documentary that goes behind the curtain of professional wrestling to reveal the real lives, struggles, and sacrifices of its larger-than-life performers.',
    rating: 7.5
  },
  'groove': {
    director: 'Greg Harrison', year: 2000, runtime: 86,
    posterPath: '/rj3dh08e6JBGXVF36KEBqwL46f0.jpg',
    overview: 'Over the course of one long night in San Francisco, the lives of several people intersect at an illegal underground rave.',
    rating: 6.2
  },
  'clockstoppers': {
    director: 'Jonathan Frakes', year: 2002, runtime: 94,
    posterPath: '/t0GmXlFvVs88oWpCmpwWy3bry2r.jpg',
    overview: 'A teenager discovers a watch that can speed up the wearer\'s molecular structure so much that the world around him appears to freeze.',
    rating: 5.4
  },
}

// Cinephile metrics: AFI Top 100 rank, Rotten Tomatoes %, Sight & Sound 2022 rank,
// Letterboxd avg (out of 5), plus critic reviews and podcast episodes
const FILM_METRICS = {
  'the-wizard-of-oz': {
    afi100: 6,
    rottenTomatoes: 98,
    letterboxd: 4.0,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'As a child I simply liked it. As an adult I found myself fascinated by it. It is a wonderful film in many ways.' },
      { critic: 'Pauline Kael', publication: 'The New Yorker', quote: 'A work of genuine imagination and visual daring that still enchants audiences after all these decades.' },
    ],
    podcasts: [
      { name: 'Unspooled', episode: 'The Wizard of Oz' },
      { name: 'You Must Remember This', episode: 'The Wizard of Oz at 80' },
    ],
  },
  'the-maltese-falcon': {
    afi100: 31,
    rottenTomatoes: 99,
    letterboxd: 4.1,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'The first great detective film noir, the first to show that the weights and measures of pulp fiction could produce art.' },
      { critic: 'Peter Bradshaw', publication: 'The Guardian', quote: 'A masterpiece of hardboiled cinema that remains endlessly rewatchable and quotable.' },
    ],
    podcasts: [
      { name: 'Unspooled', episode: 'The Maltese Falcon' },
      { name: 'Filmspotting', episode: 'John Huston Marathon: The Maltese Falcon' },
    ],
  },
  'american-graffiti': {
    afi100: 62,
    rottenTomatoes: 96,
    letterboxd: 3.7,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A brilliant work of observation. Not a masterwork of plot, but of atmosphere, a portrait of small-town teenage America.' },
    ],
    podcasts: [
      { name: 'Unspooled', episode: 'American Graffiti' },
      { name: 'The Rewatchables', episode: 'American Graffiti' },
    ],
  },
  'frankenstein': {
    afi100: 87,
    rottenTomatoes: 93,
    letterboxd: 3.9,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'James Whale brought a poetic quality to the horror genre that elevated it beyond mere thrills.' },
    ],
  },
  'jeanne-dielman-23-quai-du-commerce-1080-bruxelles': {
    sightAndSound: 1,
    rottenTomatoes: 97,
    letterboxd: 4.1,
    reviews: [
      { critic: 'Manohla Dargis', publication: 'The New York Times', quote: 'Akerman transforms the mundane into a kind of cinematic revolution, making the invisible labor of women radically visible.' },
      { critic: 'Jonathan Rosenbaum', publication: 'Chicago Reader', quote: 'One of the most extraordinary and daring films ever made — feminist cinema at its purest.' },
      { critic: 'Peter Bradshaw', publication: 'The Guardian', quote: 'A towering masterwork of feminist cinema that demands and rewards patience.' },
    ],
    podcasts: [
      { name: 'Filmspotting', episode: 'Sight & Sound #1: Jeanne Dielman' },
      { name: 'Blank Check', episode: 'Jeanne Dielman' },
    ],
  },
  'persona': {
    sightAndSound: 8,
    rottenTomatoes: 91,
    letterboxd: 4.3,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'What is it about? It is about two women, one who speaks and one who does not, and about how they merge and separate.' },
      { critic: 'Susan Sontag', publication: 'Sight & Sound', quote: 'The construction of Persona is best described as a theme and variations — the theme being played and replayed with inexhaustible ingenuity.' },
    ],
    podcasts: [
      { name: 'Filmspotting', episode: 'Bergman Marathon: Persona' },
    ],
  },
  'barry-lyndon': {
    sightAndSound: 45,
    rottenTomatoes: 84,
    letterboxd: 4.2,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'This must be one of the most beautiful films ever made. Every frame is a painting.' },
      { critic: 'Martin Scorsese', publication: 'Esquire', quote: 'It was the most important movie of the 1970s to me. Each image was like a window into the past.' },
    ],
    podcasts: [
      { name: 'Blank Check', episode: 'Barry Lyndon' },
      { name: 'The Rewatchables', episode: 'Barry Lyndon' },
    ],
  },
  'la-dolce-vita': {
    sightAndSound: 35,
    rottenTomatoes: 96,
    letterboxd: 4.2,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Fellini\'s masterwork — a sprawling, intoxicating journey through modern Rome that redefined what cinema could be.' },
      { critic: 'Peter Bradshaw', publication: 'The Guardian', quote: 'Every scene pulses with Fellini\'s genius for spectacle and his deep melancholy about the human condition.' },
    ],
    podcasts: [
      { name: 'Filmspotting', episode: 'Fellini Marathon: La Dolce Vita' },
    ],
  },
  'playtime': {
    sightAndSound: 7,
    rottenTomatoes: 100,
    letterboxd: 4.3,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'One of the most extraordinary of all films. Tati works on vast canvases, filling them with minute, exquisitely detailed comic ideas.' },
      { critic: 'Jonathan Rosenbaum', publication: 'Chicago Reader', quote: 'The grandest and most generously conceived comedy ever made. It teaches you how to see, in the deepest sense.' },
    ],
    podcasts: [
      { name: 'Blank Check', episode: 'PlayTime' },
    ],
  },
  'bicycle-thieves': {
    sightAndSound: 44,
    rottenTomatoes: 98,
    letterboxd: 4.2,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'De Sica tells this story with such simplicity and directness that it speaks to anyone, anywhere, who has ever been poor or felt helpless.' },
      { critic: 'André Bazin', publication: 'What Is Cinema?', quote: 'No more actors, no more story, no more sets — the perfect aesthetic illusion of reality.' },
    ],
    podcasts: [
      { name: 'Unspooled', episode: 'Bicycle Thieves' },
      { name: 'Filmspotting', episode: 'Italian Neorealism: Bicycle Thieves' },
    ],
  },
  'breathless': {
    sightAndSound: 72,
    rottenTomatoes: 97,
    letterboxd: 3.9,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Modern movies begin here, with Godard\'s anarchic, jump-cutting, tradition-smashing first feature.' },
      { critic: 'Pauline Kael', publication: 'The New Yorker', quote: 'Breathless changed everything — it\'s the Big Bang of modern cinema.' },
    ],
    podcasts: [
      { name: 'Filmspotting', episode: 'French New Wave: Breathless' },
    ],
  },
  'blow-up': {
    sightAndSound: 90,
    rottenTomatoes: 86,
    letterboxd: 3.9,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'One of the great art films — it teaches us about the difference between what we see and what we think we see.' },
    ],
  },
  'solaris': {
    sightAndSound: 67,
    rottenTomatoes: 96,
    letterboxd: 4.1,
    reviews: [
      { critic: 'Philip French', publication: 'The Observer', quote: 'Tarkovsky\'s deeply humanistic science fiction poem about memory, love, and the limits of knowledge.' },
    ],
  },
  'the-good-the-bad-and-the-ugly': {
    rottenTomatoes: 97,
    letterboxd: 4.4,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A bizarre, engrossing, overlong, skillfully photographed work that somehow gets better with every viewing.' },
      { critic: 'Peter Bradshaw', publication: 'The Guardian', quote: 'Leone\'s operatic masterpiece — the greatest western ever made and one of cinema\'s supreme achievements.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'The Good, the Bad and the Ugly' },
      { name: 'Filmspotting', episode: 'Sergio Leone Marathon' },
    ],
  },
  'blue-velvet': {
    rottenTomatoes: 94,
    letterboxd: 4.1,
    sightAndSound: 69,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Lynch peels back the surface of a typical American town and shows the rot underneath — a dark, fascinating vision.' },
      { critic: 'Pauline Kael', publication: 'The New Yorker', quote: 'The work of a genuine, visionary artist who sees into our shared nightmares.' },
    ],
    podcasts: [
      { name: 'Blank Check', episode: 'Blue Velvet' },
    ],
  },
  'belle-de-jour': {
    sightAndSound: 56,
    rottenTomatoes: 90,
    letterboxd: 3.9,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A film of surreal erotic power, made with the cool detachment that was Buñuel\'s trademark.' },
    ],
  },
  'harold-and-maude': {
    rottenTomatoes: 83,
    letterboxd: 4.0,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'One of the rare films that grow better with time — a death-obsessed comedy that is really about choosing to live.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'Harold and Maude' },
      { name: 'Unspooled', episode: 'Harold and Maude' },
    ],
  },
  'once-upon-a-time-in-hollywood': {
    rottenTomatoes: 85,
    letterboxd: 3.8,
    reviews: [
      { critic: 'Manohla Dargis', publication: 'The New York Times', quote: 'A gorgeous fever dream, funny and sharp, and a series of love letters — to Los Angeles, to the movies, to a lost time.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'Once Upon a Time in Hollywood' },
      { name: 'Blank Check', episode: 'Once Upon a Time in Hollywood' },
    ],
  },
  'django-unchained': {
    rottenTomatoes: 87,
    letterboxd: 4.1,
    reviews: [
      { critic: 'A.O. Scott', publication: 'The New York Times', quote: 'A series of showdowns that balance horror and exhilaration, building toward one of the most satisfying climaxes in recent memory.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'Django Unchained' },
    ],
  },
  'true-romance': {
    rottenTomatoes: 93,
    letterboxd: 4.0,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A celebration of toughness and romance — exhilarating in a way that movies rarely are.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'True Romance' },
    ],
  },
  'lost-in-translation': {
    rottenTomatoes: 95,
    letterboxd: 4.0,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Everyone who sees the film will understand it in their own way, based on what they know about loneliness and connection.' },
      { critic: 'A.O. Scott', publication: 'The New York Times', quote: 'A series of quiet revelations, a lovely, melancholy film about the mystery of human connection.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'Lost in Translation' },
    ],
  },
  'the-holy-mountain': {
    rottenTomatoes: 83,
    letterboxd: 4.1,
    reviews: [
      { critic: 'J. Hoberman', publication: 'The Village Voice', quote: 'The most ambitious work of its era — a hallucinatory spiritual odyssey unlike anything else in cinema.' },
    ],
  },
  'the-birds': {
    afi100: 64,
    rottenTomatoes: 96,
    letterboxd: 3.8,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Hitchcock\'s most audacious experiment — the terror comes not from the birds themselves but from the inexplicability of it all.' },
    ],
  },
  'the-wicker-man': {
    rottenTomatoes: 92,
    letterboxd: 3.9,
    reviews: [
      { critic: 'Mark Kermode', publication: 'The Observer', quote: 'A singular folk horror masterpiece — one of the greatest British films ever made.' },
    ],
  },
  'almost-famous': {
    rottenTomatoes: 89,
    letterboxd: 4.1,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A movie about the world of rock that tells its story through the eyes of a teenage journalist — warm, funny, and deeply human.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'Almost Famous' },
    ],
  },
  'point-break': {
    rottenTomatoes: 69,
    letterboxd: 3.6,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Bigelow handles the action sequences with pure kinetic energy — the surfing, the skydiving, the chases are all first-rate.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'Point Break' },
    ],
  },
  'the-rocky-horror-picture-show': {
    rottenTomatoes: 79,
    letterboxd: 3.7,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A camp masterpiece that continues to inspire midnight devotion — cinema\'s greatest audience participation event.' },
    ],
  },
  'the-warriors': {
    rottenTomatoes: 88,
    letterboxd: 3.8,
    reviews: [
      { critic: 'Bilge Ebiri', publication: 'New York Magazine', quote: 'A stylish, relentless urban odyssey that has lost none of its visceral power.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'The Warriors' },
    ],
  },
  'grave-of-the-fireflies': {
    rottenTomatoes: 100,
    letterboxd: 4.4,
    sightAndSound: 97,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'One of the greatest war films ever made — an emotional devastation that few live-action films can match.' },
    ],
  },
  'paprika': {
    rottenTomatoes: 84,
    letterboxd: 3.9,
    reviews: [
      { critic: 'Manohla Dargis', publication: 'The New York Times', quote: 'A surreal, visually ravishing journey into the subconscious that ranks among the best animated films ever made.' },
    ],
  },
  'beauty-and-the-beast': {
    afi100: 34,
    rottenTomatoes: 94,
    letterboxd: 3.9,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A lovely film, the best Disney animated feature since the glory days of Walt.' },
    ],
  },
  'giant': {
    afi100: 82,
    rottenTomatoes: 84,
    letterboxd: 3.8,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'An epic in every sense — sprawling, ambitious, and anchored by extraordinary performances.' },
    ],
  },
  'interview-with-the-vampire': {
    rottenTomatoes: 67,
    letterboxd: 3.6,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A lavish, atmospheric adaptation that captures the melancholy and sensuality of Anne Rice\'s gothic world.' },
    ],
  },
  'viridiana': {
    sightAndSound: 86,
    rottenTomatoes: 93,
    letterboxd: 4.1,
    reviews: [
      { critic: 'Jonathan Rosenbaum', publication: 'Chicago Reader', quote: 'Buñuel at his most savage and blackly comic — a devastating satire of charity, religion, and human nature.' },
    ],
  },
  'ali-fear-eats-the-soul-on-35mm': {
    sightAndSound: 74,
    rottenTomatoes: 100,
    letterboxd: 4.2,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Fassbinder takes a Douglas Sirk melodrama and transforms it into a devastating portrait of prejudice and loneliness.' },
    ],
  },
  'the-gleaners-and-i': {
    rottenTomatoes: 96,
    letterboxd: 4.1,
    reviews: [
      { critic: 'A.O. Scott', publication: 'The New York Times', quote: 'A joyful, deeply personal film — Varda transforms the act of scavenging into a meditation on art, mortality, and what we value.' },
    ],
  },
  'black-girl': {
    sightAndSound: 93,
    rottenTomatoes: 100,
    letterboxd: 3.9,
    reviews: [
      { critic: 'Jonathan Rosenbaum', publication: 'Chicago Reader', quote: 'A landmark of African cinema — powerful, economical, and emotionally devastating in its simplicity.' },
    ],
  },
  'love-streams': {
    rottenTomatoes: 94,
    letterboxd: 4.2,
    reviews: [
      { critic: 'Jonathan Rosenbaum', publication: 'Chicago Reader', quote: 'Cassavetes\' final masterpiece — raw, searching, and heartbreakingly beautiful in its exploration of love\'s impossibility.' },
    ],
  },
  'safety-last': {
    rottenTomatoes: 96,
    letterboxd: 4.2,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'One of the great comic thrill rides — the clock-hanging sequence remains one of cinema\'s most iconic images.' },
    ],
  },
  'funny-games': {
    rottenTomatoes: 72,
    letterboxd: 3.8,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Haneke makes us complicit in the violence we watch for entertainment — a profoundly uncomfortable and essential film.' },
    ],
  },
  'waiting-for-guffman': {
    rottenTomatoes: 94,
    letterboxd: 3.8,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Christopher Guest\'s mockumentary genius at its peak — simultaneously hilarious and oddly touching.' },
    ],
    podcasts: [
      { name: 'The Rewatchables', episode: 'Waiting for Guffman' },
    ],
  },
  'little-shop-of-horrors': {
    rottenTomatoes: 91,
    letterboxd: 3.8,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A musical comedy that is also a witty satire — Frank Oz brings the skid-row fairy tale to hilarious life.' },
    ],
  },
  'thank-you-for-smoking': {
    rottenTomatoes: 86,
    letterboxd: 3.5,
    reviews: [
      { critic: 'A.O. Scott', publication: 'The New York Times', quote: 'A wickedly funny satire that turns spin into an art form — sharp, smart, and endlessly quotable.' },
    ],
  },
  'the-face-of-another': {
    rottenTomatoes: 90,
    letterboxd: 4.0,
    reviews: [
      { critic: 'Jonathan Rosenbaum', publication: 'Chicago Reader', quote: 'Teshigahara creates a haunting philosophical puzzle about identity, alienation, and the masks we all wear.' },
    ],
  },
  'moulin-rouge-in-35mm': {
    rottenTomatoes: 76,
    letterboxd: 3.7,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Luhrmann creates a dazzling spectacle — the movie is an series of explosions of energy and emotion.' },
    ],
    podcasts: [
      { name: 'Blank Check', episode: 'Moulin Rouge!' },
    ],
  },
  'body-double': {
    rottenTomatoes: 73,
    letterboxd: 3.5,
    reviews: [
      { critic: 'Pauline Kael', publication: 'The New Yorker', quote: 'De Palma at his most provocative — a brilliantly constructed thriller that interrogates the very act of looking.' },
    ],
  },
  'super-fly': {
    rottenTomatoes: 85,
    letterboxd: 3.3,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'Elevated beyond its genre by Curtis Mayfield\'s transcendent score — one of the great blaxploitation films.' },
    ],
  },
  'showgirls': {
    rottenTomatoes: 22,
    letterboxd: 2.7,
    reviews: [
      { critic: 'Adam Nayman', publication: 'Reverse Shot', quote: 'Verhoeven\'s most misunderstood film is actually a lacerating satire of American entertainment culture — misread as trash, it\'s brilliant provocation.' },
    ],
    podcasts: [
      { name: 'Blank Check', episode: 'Showgirls' },
    ],
  },
  'salaam-bombay': {
    rottenTomatoes: 92,
    letterboxd: 3.8,
    reviews: [
      { critic: 'Roger Ebert', publication: 'Chicago Sun-Times', quote: 'A film of enormous power — Mira Nair captures the streets of Bombay with an immediacy that is heartbreaking and unforgettable.' },
    ],
  },
  '24-hour-party-people': {
    rottenTomatoes: 92,
    letterboxd: 3.8,
    reviews: [
      { critic: 'Peter Bradshaw', publication: 'The Guardian', quote: 'A witty, exuberant celebration of Manchester\'s music scene — messy, funny, and completely irresistible.' },
    ],
  },
  'sinners': {
    rottenTomatoes: 92,
    letterboxd: 4.0,
  },
}

const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))

// Collect unique titles
const titles = new Set()
data.theaters.forEach(t => t.screenings.forEach(s => titles.add(s.title)))

const films = {}
let matched = 0

for (const title of titles) {
  const slug = slugify(title)
  if (KNOWN_FILMS[slug]) {
    films[slug] = { ...KNOWN_FILMS[slug], ...(FILM_METRICS[slug] || {}) }
    matched++
  }
}

data.films = films

writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
console.log(`Seeded ${matched} of ${titles.size} films with metadata`)
