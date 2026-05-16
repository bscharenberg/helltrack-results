/**
 * helltrack-results Worker v4
 * Returns all PDF URLs from the results page.
 * Label extraction happens server-side by reading PDF content IDs.
 * Filtering by discipline happens in GitHub Actions PDF parser.
 */

import puppeteer from '@cloudflare/puppeteer'

const CALENDAR_2026 = [
  { slug: 'race-of-south-korea-2026', name: 'Mona YongPyong', date: '2026-05-01' },
  { slug: 'loudenvielle-2026',         name: 'Loudenvielle',   date: '2026-05-28' },
  { slug: 'leogang-2026',              name: 'Leogang',        date: '2026-06-11' },
  { slug: 'lenzerheide-2026',          name: 'Lenzerheide',    date: '2026-06-19' },
  { slug: 'la-thuile-2026',            name: 'La Thuile',      date: '2026-07-03' },
  { slug: 'pal-arinsal-2026',          name: 'Pal Arinsal',    date: '2026-07-09' },
  { slug: 'les-gets-2026',             name: 'Les Gets',       date: '2026-08-20' },
  { slug: 'val-di-sole-2026',          name: 'Val di Sole',    date: '2026-08-26' },
  { slug: 'whistler-2026',             name: 'Whistler',       date: '2026-09-25' },
  { slug: 'lake-placid-2026',          name: 'Lake Placid',    date: '2026-10-02' },
]

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const venueSlug = url.searchParams.get('venue')

    if (!venueSlug) {
      return Response.json({
        calendar: CALENDAR_2026,
        usage: 'GET /?venue=race-of-south-korea-2026',
      }, { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    const venue = CALENDAR_2026.find(r => r.slug === venueSlug)
    let browser = null

    try {
      browser = await puppeteer.launch(env.MYBROWSER)
      const page = await browser.newPage()

      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')

      const pageUrl = `https://www.ucimtbworldseries.com/results/2026/${venueSlug}`
      await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 25000 })
      await page.waitForSelector('a[href*="assets.ucimtbworldseries.com"]', { timeout: 10000 })

      // Get all PDF URLs — labels will be read from PDF content by the parser
      const pdfUrls = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a[href*=".pdf"]')
        return Array.from(anchors).map(a => a.href)
      })

      await page.close()
      console.log(`Found ${pdfUrls.length} PDF URLs`)

      return Response.json({
        venue: venue?.name || venueSlug,
        slug: venueSlug,
        date: venue?.date || null,
        fetchedAt: new Date().toISOString(),
        pdfUrls,
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=1800',
        }
      })

    } catch (err) {
      console.error('Error:', err.message)
      return Response.json({ error: err.message }, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } finally {
      if (browser) await browser.close()
    }
  }
}
