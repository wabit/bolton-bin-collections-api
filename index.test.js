const supertest = require('supertest');
const { server } = require('./index');

const TEST_POSTCODE = 'bl2 4ds';
const TEST_ADDRESS = '100010920644';

describe('Bin Collection API', () => {
  afterAll((done) => {
    server.close(done);
  });

  it('should return 400 if postcode or address is missing', async () => {
    const res = await supertest(server).get('/bin-collection');
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Missing postcode or address/);
  });

  it('should return 200 and bin info for valid postcode and address', async () => {
    const res = await supertest(server).get(`/bin-collection?postcode=${encodeURIComponent(TEST_POSTCODE)}&address=${encodeURIComponent(TEST_ADDRESS)}`);
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('ok');
    // At least one bin type should be present
    expect(Object.keys(res.body).length).toBeGreaterThan(1);
    // Check structure of a bin
    const bin = res.body.green || res.body.grey || res.body.beige || res.body.burgundy;
    expect(bin).toHaveProperty('date');
    expect(bin).toHaveProperty('image');
    expect(bin).toHaveProperty('relative_time');
  });
});