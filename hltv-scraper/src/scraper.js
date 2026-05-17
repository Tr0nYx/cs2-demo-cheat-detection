const { chromium } = require('playwright');

async function scrapeMatch(matchUrl) {
  let browser;
  try {
    // Launch headless chromium
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    const page = await context.newPage();
    
    console.log(`Navigating to ${matchUrl}`);
    await page.goto(matchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the Cloudflare challenge to pass or specific elements to appear
    try {
      await page.waitForSelector('.match-page', { timeout: 15000 });
    } catch (e) {
      // If we don't see the match page within 15 seconds, we might be blocked by Cloudflare
      const isCloudflare = await page.evaluate(() => {
        return document.body.innerHTML.includes('Cloudflare') || document.body.innerHTML.includes('Just a moment');
      });
      
      if (isCloudflare) {
        throw new Error('cloudflare_blocked');
      }
      // If it's not cloudflare, it might just be a slow load or bad url. We'll throw cloudflare_blocked to be safe.
      throw new Error('cloudflare_blocked');
    }

    // Extract Demo URL
    let demoUrl = null;
    try {
      demoUrl = await page.evaluate(() => {
        const demoLink = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('/download/demo/'));
        return demoLink ? demoLink.href : null;
      });
    } catch (e) {
      console.warn("Could not find demo URL");
    }

    // Extract Player Stats
    const players = await page.evaluate(() => {
      const results = [];
      // HLTV typically uses tables for stats on the match page.
      // This is a basic extraction logic that targets stats rows.
      const statsTables = document.querySelectorAll('table.table.totalstats');
      
      statsTables.forEach(table => {
        const teamName = table.closest('.stats-content')?.querySelector('.teamName')?.innerText.trim() || 'Unknown';
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const nameEl = row.querySelector('.player-nick');
          if (!nameEl) return;
          
          const name = nameEl.innerText.trim();
          const kdEl = row.querySelector('.kd');
          let kills = 0, deaths = 0;
          if (kdEl) {
            const kdText = kdEl.innerText.trim().split('-');
            kills = parseInt(kdText[0]) || 0;
            deaths = parseInt(kdText[1]) || 0;
          }
          
          const ratingEl = row.querySelector('.rating');
          const rating = ratingEl ? parseFloat(ratingEl.innerText.trim()) : 0;

          results.push({
            name,
            team: teamName,
            kills,
            deaths,
            rating
          });
        });
      });
      return results;
    });

    return {
      demoUrl,
      players
    };

  } catch (error) {
    console.error("Scraper error:", error.message);
    if (error.message.includes('cloudflare_blocked')) {
      throw new Error('cloudflare_blocked');
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { scrapeMatch };
