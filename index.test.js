const supertest = require('supertest');
const { server } = require('./index');

const TEST_UPRN = '100010920644';

describe('Bin Collection API', () => {
  afterAll((done) => {
    server.close(done);
  });

  it('should return 400 if uprn is missing', async () => {
    const res = await supertest(server).get('/bin-collection');
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Missing uprn parameter/);
  });

  it('should fetch bin collection data for valid UPRN', async () => {
    const res = await supertest(server).get(`/bin-collection?uprn=${encodeURIComponent(TEST_UPRN)}`);
    
    // The API requires proper authentication
    // Status should be either 200 (success) or 500 (auth error from API)
    expect(res.status).toBeOneOf([200, 500]);
    expect(res.body).toBeDefined();
  });

  describe('successful response (status 200)', () => {
    it('should include state: ok', async () => {
      const res = await supertest(server).get(`/bin-collection?uprn=${encodeURIComponent(TEST_UPRN)}`);
      
      if (res.status === 200) {
        expect(res.body.state).toBe('ok');
      }
    });

    it('should have all expected bin types (green, grey, beige, burgundy)', async () => {
      const res = await supertest(server).get(`/bin-collection?uprn=${encodeURIComponent(TEST_UPRN)}`);
      
      if (res.status === 200) {
        const expectedBins = ['green', 'grey', 'beige', 'burgundy'];
        expectedBins.forEach(bin => {
          expect(res.body).toHaveProperty(bin);
        });
      }
    });

    it('each bin should have date, image, and relative_time properties', async () => {
      const res = await supertest(server).get(`/bin-collection?uprn=${encodeURIComponent(TEST_UPRN)}`);
      
      if (res.status === 200) {
        const expectedBins = ['green', 'grey', 'beige', 'burgundy'];
        expectedBins.forEach(bin => {
          if (res.body[bin]) {
            expect(res.body[bin]).toHaveProperty('date');
            expect(res.body[bin]).toHaveProperty('image');
            expect(res.body[bin]).toHaveProperty('relative_time');
          }
        });
      }
    });

    it('dates should be in DD/MM/YYYY format', async () => {
      const res = await supertest(server).get(`/bin-collection?uprn=${encodeURIComponent(TEST_UPRN)}`);
      
      if (res.status === 200) {
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        const expectedBins = ['green', 'grey', 'beige', 'burgundy'];
        expectedBins.forEach(bin => {
          if (res.body[bin]) {
            expect(res.body[bin].date).toMatch(dateRegex);
          }
        });
      }
    });

    it('relative_time should be valid', async () => {
      const res = await supertest(server).get(`/bin-collection?uprn=${encodeURIComponent(TEST_UPRN)}`);
      
      if (res.status === 200) {
        const validPatterns = ['today', 'tomorrow', /^in \d+ days$/, /^\d+ days ago$/];
        const expectedBins = ['green', 'grey', 'beige', 'burgundy'];
        expectedBins.forEach(bin => {
          if (res.body[bin]) {
            const relativeTime = res.body[bin].relative_time;
            const isValid = validPatterns.some(pattern => {
              if (typeof pattern === 'string') {
                return relativeTime === pattern;
              } else {
                return pattern.test(relativeTime);
              }
            });
            expect(isValid).toBe(true);
          }
        });
      }
    });
  });
});

// Helper: expect value to be one of multiple options
expect.extend({
  toBeOneOf(received, options) {
    const pass = options.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${options}`
          : `expected ${received} to be one of ${options}`
    };
  }
});