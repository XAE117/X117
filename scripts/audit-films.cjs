const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/theaters.json','utf8'));
const enrichments = JSON.parse(fs.readFileSync('public/film-enrichments.json','utf8'));
const titles = new Set();
for (const t of data.theaters) {
  for (const s of t.screenings) {
    titles.add(s.title);
  }
}
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const films = data.films || {};
let missing_rt = 0, missing_lb = 0, missing_reviews = 0, missing_podcasts = 0, missing_overview = 0, no_film = 0;
const missingList = [];
const partialList = [];
for (const title of titles) {
  const slug = slugify(title);
  const film = films[slug];
  const enr = enrichments[slug];
  if (!film && !enr) { no_film++; missingList.push(title); continue; }
  const merged = {...(film||{}), ...(enr||{})};
  const gaps = [];
  if (!merged.rottenTomatoes) { missing_rt++; gaps.push('RT'); }
  if (!merged.letterboxd) { missing_lb++; gaps.push('LB'); }
  if (!merged.reviews || merged.reviews.length === 0) { missing_reviews++; gaps.push('reviews'); }
  if (!merged.podcasts || merged.podcasts.length === 0) { missing_podcasts++; gaps.push('podcasts'); }
  if (!merged.overview) { missing_overview++; gaps.push('overview'); }
  if (gaps.length > 0) partialList.push({ title, slug, gaps });
}
console.log('Total unique titles:', titles.size);
console.log('Enrichments file entries:', Object.keys(enrichments).length);
console.log('Films in theaters.json:', Object.keys(films).length);
console.log('');
console.log('No film data at all:', no_film);
console.log('Missing RT score:', missing_rt);
console.log('Missing Letterboxd:', missing_lb);
console.log('Missing reviews:', missing_reviews);
console.log('Missing podcasts:', missing_podcasts);
console.log('Missing overview:', missing_overview);
console.log('\n--- Titles with NO data at all ---');
missingList.forEach(t => console.log(' ', t));
console.log('\n--- Titles with partial data (missing fields) ---');
partialList.forEach(p => console.log(' ', p.title, '- missing:', p.gaps.join(', ')));
