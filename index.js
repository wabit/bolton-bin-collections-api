const https = require('https');
const querystring = require('querystring');
const cheerio = require('cheerio');
const { parse, format, differenceInDays, isValid } = require('date-fns');
const http = require('http');
const url = require('url');

function callService(postcode, address, callback) {
  const postData = querystring.stringify({
    '__EVENTTARGET': 'ddlAddresses',
    '__EVENTARGUMENT': '',
    '__LASTFOCUS': '',
    '__VIEWSTATE': '/wEPDwULLTE3NjkxMDI1MjYPZBYCAgEPZBYCAgMPDxYCHgdWaXNpYmxlZ2QWAgIDDxAPFgYeDURhdGFUZXh0RmllbGQFC0Z1bGxBZGRyZXNzHg5EYXRhVmFsdWVGaWVsZAUEVVBSTh4LXyFEYXRhQm91bmRnZBAVEwMtLS0SMSBSSURJTkcgR0FURSBNRVdTEzExIFJJRElORyBHQVRFIE1FV1MTMTMgUklESU5HIEdBVEUgTUVXUxMxNSBSSURJTkcgR0FURSBNRVdTEzE3IFJJRElORyBHQVRFIE1FV1MTMTkgUklESU5HIEdBVEUgTUVXUxMyMSBSSURJTkcgR0FURSBNRVdTEzIzIFJJRElORyBHQVRFIE1FV1MTMjUgUklESU5HIEdBVEUgTUVXUxMyNyBSSURJTkcgR0FURSBNRVdTEzI5IFJJRElORyBHQVRFIE1FV1MSMyBSSURJTkcgR0FURSBNRVdTEzMxIFJJRElORyBHQVRFIE1FV1MTMzMgUklESU5HIEdBVEUgTUVXUxMzNSBSSURJTkcgR0FURSBNRVdTEjUgUklESU5HIEdBVEUgTUVXUxI3IFJJRElORyBHQVRFIE1FV1MSOSBSSURJTkcgR0FURSBNRVdTFRMDLS0tDDEwMDAxMDkyMDYzMwwxMDAwMTA5MjA2MzgMMTAwMDEwOTIwNjM5DDEwMDAxMDkyMDY0MAwxMDAwMTA5MjA2NDEMMTAwMDEwOTIwNjQyDDEwMDAxMDkyMDY0MwwxMDAwMTA5MjA2NDQMMTAwMDEwOTIwNjQ1DDEwMDAxMDkyMDY0NgwxMDAwMTA5MjA2NDcMMTAwMDEwOTIwNjM0DDEwMDAxMDkyMDY0OAwxMDAwMTA5MjA2NDkMMTAwMDEwOTIwNjUwDDEwMDAxMDkyMDYzNQwxMDAwMTA5MjA2MzYMMTAwMDEwOTIwNjM3FCsDE2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2cWAWZkZL90xmX0yZMDJ5v4vZ/sXkoCn1BT',
    '__VIEWSTATEGENERATOR': 'EABFF864',
    '__EVENTVALIDATION': '/wEdABcCTwXgkVTVf1q+OrGaQKHw7fSJevDr2c91EoBbDh5wZTzmltaUM7aEAN+g9cP/m123aOWQ6je/vrGB2nEag2McSb0vJwwu9VS/UyNmRlDwuZkSMC9w6QfWdyWd8Vo8KJd9Y67UcSwcP+F/Ed+C2FusS26Vgssmzzokpj90v4rOZqIMBb0N3V04fEROm/vt9LvC5EoXV2eFMQVMnLjPPIcv+JmRnkCZpHwchBVdIuvviceA31bUBpR9IBOwcieh9dXZb9s3Dx/+N5SVIUYwmcIrrv0bgTAnXZeUybUkqjmWkscORtEkkuOef+l4guJiwvab5UiKFgtc3/Yz4k35qdO9TIjx+A0G8FBffgcHbRbQ14/Ydinnok4rflK1dPGWEwmghiDrw688dLVEV/bEczQZMFGpe5S7h9DQuhTo1dLoBxkgsk4nnhPumwPqXtT3cVnsOxGsGRxh5SWuo1R958Ws9VZaqV6Z6+bUo67ivVVYUx4xTo4e2eTsuAOofT3fZ2uwh8bh',
    'txtPostcode': postcode,
    'ddlAddresses': address
  });

  const options = {
    hostname: 'web.bolton.gov.uk',
    port: 443,
    path: '/bins.aspx',
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://web.bolton.gov.uk',
      'Connection': 'keep-alive',
      'Referer': 'https://web.bolton.gov.uk/bins.aspx',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Priority': 'u=4',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const $ = cheerio.load(data);
      const binInfo = {};

      $('.bin-info').each((i, elem) => {
        const binType = $(elem).find('strong').text().trim().split(' ')[2].toLowerCase();
        const nextDate = $(elem).find('.date-list .date span').first().text().trim();
        const imageUrl = $(elem).find('img').attr('src');
        if (nextDate) {
          const parsedDate = parse(nextDate, 'EEEE dd MMMM yyyy', new Date());
          if (isValid(parsedDate)) {
            const formattedDate = format(parsedDate, 'dd/MM/yyyy');
            const relativeTime = differenceInDays(parsedDate, new Date());
            let relativeTimeText;
            if (relativeTime === 0) {
              relativeTimeText = 'Today';
            } else if (relativeTime === 1) {
              relativeTimeText = 'Tomorrow';
            } else {
              relativeTimeText = `in ${relativeTime} days`;
            }
            binInfo[binType] = {
              date: formattedDate,
              image: imageUrl,
              relative_time: relativeTimeText
            };
          }
        }
      });

      callback(binInfo);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

const server = http.createServer((req, res) => {
  const queryObject = url.parse(req.url, true).query;
  const postcode = queryObject.postcode;
  const address = queryObject.address;

  if (req.url.startsWith('/bin-collection') && req.method === 'GET' && postcode && address) {
    callService(postcode, address, (binInfo) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ state: 'ok', ...binInfo }));
    });
  } else {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Missing postcode or address');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

module.exports = { server };