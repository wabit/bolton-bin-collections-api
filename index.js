const https = require('https');
const cheerio = require('cheerio');
const { parse, format, differenceInDays, isValid, addDays } = require('date-fns');
const http = require('http');
const { URL } = require('url');

// Step 1: Access /api/citizen to get a session
// Step 2: Use that session's Authorization header for the API call
function getAuthToken(callback) {
  // First call /api/citizen to establish a session on the form domain
  const citizenOptions = {
    hostname: 'bolton.form.uk.empro.verintcloudservices.com',
    port: 443,
    path: '/api/citizen?archived=Y&preview=false&locale=en',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Origin': 'https://bolton.portal.uk.empro.verintcloudservices.com',
      'Referer': 'https://bolton.portal.uk.empro.verintcloudservices.com/',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'
    }
  };
  
  const req = https.request(citizenOptions, (res) => {
    let data = '';
    const authHeader = res.headers['authorization'];
    
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (!authHeader) {
        callback(new Error('No Authorization header from /api/citizen'));
        return;
      }
      
      // Now get CSRF token from portal
      const portalOptions = {
        hostname: 'bolton.portal.uk.empro.verintcloudservices.com',
        port: 443,
        path: '/site/empro-bolton/request/es_bin_collection_dates',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'
        }
      };
      
      const portalReq = https.request(portalOptions, (portalRes) => {
        let portalData = '';
        portalRes.on('data', (chunk) => { portalData += chunk; });
        portalRes.on('end', () => {
          try {
            const match = portalData.match(/<meta name="_csrf_token" content="([^"]+)"/);
            if (!match || !match[1]) {
              callback(new Error('Could not extract CSRF token from portal'));
              return;
            }
            
            const csrfToken = match[1];
            callback(null, { csrfToken, authHeader });
          } catch (e) {
            callback(e);
          }
        });
      });
      
      portalReq.on('error', callback);
      portalReq.end();
    });
  });
  
  req.on('error', callback);
  req.end();
}

function callService(uprn, callback) {
  // Get CSRF token from portal
  getAuthToken((err, auth) => {
    if (err) {
      callback({ error: `Failed to get auth token: ${err.message}` });
      return;
    }

    const csrfToken = auth.csrfToken;
    const authHeader = auth.authHeader;

    // Calculate date range for the API (current date + 8 weeks)
    const today = new Date();
    const startDate = format(today, 'dd/MM/yyyy');
    const endDate = format(addDays(today, 56), 'dd/MM/yyyy');

    const postData = JSON.stringify({
      name: 'es_bin_collection_dates',
      data: {
        uprn: uprn,
        start_date: startDate,
        end_date: endDate
      },
      email: '',
      caseid: '',
      xref: '',
      xref1: '',
      xref2: ''
    });

    const options = {
      hostname: 'bolton.form.uk.empro.verintcloudservices.com',
      port: 443,
      path: '/api/custom?action=es_get_bin_collection_dates&actionedby=uprn_changed&loadform=true&access=citizen&locale=en',
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'X-CSRF-TOKEN': csrfToken,
        'Authorization': authHeader,
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Origin': 'https://bolton.portal.uk.empro.verintcloudservices.com',
        'Referer': 'https://bolton.portal.uk.empro.verintcloudservices.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          callback({ error: `Request failed with status code: ${res.statusCode}` });
          return;
        }
        
        try {
          const jsonResponse = JSON.parse(data);
          const htmlContent = jsonResponse.data?.collection_dates;
          
          if (!htmlContent) {
            callback({ error: 'No collection data found in response' });
            return;
          }

          const $ = cheerio.load(htmlContent);
          const binInfo = { state: 'ok' };

          // Parse each bin type section
          $('div[style*="overflow:auto"]').each((i, elem) => {
            const strongText = $(elem).find('strong').text().trim();
            let imageUrl = $(elem).find('img').attr('src');
            // Clean up image URL - remove excess whitespace
            if (imageUrl) {
              imageUrl = imageUrl.replace(/\s+/g, '');
            }
            
            // Get the first date from the list
            const firstDate = $(elem).find('li').first().text().trim();
            
            if (strongText && firstDate) {
              let binType = '';
              
              if (strongText.includes('grey')) {
                binType = 'grey';
              } else if (strongText.includes('recycling') || strongText.includes('beige')) {
                binType = 'beige';
              } else if (strongText.includes('plastic') || strongText.includes('burgundy')) {
                binType = 'burgundy';
              } else if (strongText.includes('garden') || strongText.includes('green')) {
                binType = 'green';
              }
              
              if (binType) {
                // Extract date (format: "Wednesday 14 January 2026")
                const dateMatch = firstDate.match(/\d{1,2}\s+\w+\s+\d{4}/);
                if (dateMatch) {
                  const formattedDate = format(parse(dateMatch[0], 'dd MMMM yyyy', new Date()), 'dd/MM/yyyy');
                  const relativeDays = Math.floor((parse(dateMatch[0], 'dd MMMM yyyy', new Date()) - new Date()) / (1000 * 60 * 60 * 24));
                  let relativeTime;
                  
                  if (relativeDays === 0) relativeTime = 'today';
                  else if (relativeDays === 1) relativeTime = 'tomorrow';
                  else if (relativeDays < 0) relativeTime = `${Math.abs(relativeDays)} days ago`;
                  else relativeTime = `in ${relativeDays} days`;
                  
                  binInfo[binType] = {
                    date: formattedDate,
                    image: imageUrl,
                    relative_time: relativeTime
                  };
                }
              }
            }
          });
          
          callback(null, binInfo);
        } catch (e) {
          callback({ error: `Error parsing response: ${e.message}` });
        }
      });
    });

    req.on('error', (e) => {
      callback({ error: `Problem with request: ${e.message}` });
    });

    req.write(postData);
    req.end();
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const uprn = reqUrl.searchParams.get('uprn');

  // health check endpoint
  if (reqUrl.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (reqUrl.pathname.startsWith('/bin-collection') && req.method === 'GET' && uprn) {
    callService(uprn, (err, binInfo) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ state: 'error', message: err.message || err }));
        return;
      } else if (binInfo && binInfo.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ state: 'error', message: binInfo.error }));
        return;
      } else if (!binInfo || Object.keys(binInfo).length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ state: 'error', message: 'No bin information found' }));
        return;
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ state: 'ok', ...binInfo }));
      }
    });
  } else {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Missing uprn parameter');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

module.exports = { server };