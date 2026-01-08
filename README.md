# bolton-bin-collections-api

Bolton Council Bin Collection API - retrieves upcoming bin collection dates for Bolton addresses.

## How It Works

The API dynamically fetches authentication tokens from the Bolton Council portal, eliminating the need for static credentials. It then uses these tokens to retrieve bin collection dates from their API.

## Usage

The API requires a UPRN (Unique Property Reference Number) to look up bin collection dates.

### Finding Your UPRN

1. Visit https://bolton.portal.uk.empro.verintcloudservices.com/site/empro-bolton/request/es_bin_collection_dates
2. Enter your postcode
3. Select your address from the dropdown
4. Look at the browser's network tab (F12 → Network) when the dates load
5. Find the API request and note the `uprn` value in the request payload

### API Endpoint

```
GET /bin-collection?uprn=<YOUR_UPRN>
```

Example:
```bash
curl http://localhost:3000/bin-collection?uprn=100010920643
```

Response:
```json
{
  "state": "ok",
  "grey": {
    "date": "21/01/2026",
    "image": "https://www.bolton.gov.uk/images/greybin.jpg",
    "relative_time": "in 13 days"
  },
  "recycling": {
    "date": "14/01/2026",
    "image": "https://www.bolton.gov.uk/images/beigebin.jpg",
    "relative_time": "in 6 days"
  },
  ...
}
```

## Deployment

### Docker

```bash
docker build -t bolton-bin-api .
docker run -p 3000:3000 bolton-bin-api
```

### Kubernetes (Helm)

```bash
helm install bolton-bin-api ./helm
```

## Development

### Running Tests

```bash
yarn test
```

### Starting the Server

```bash
yarn start
```

The server will listen on `http://localhost:3000`
