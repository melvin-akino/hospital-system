import { successResponse, errorResponse, paginatedResponse } from './response';

// ── Mock Express Response ─────────────────────────────────────────────────────
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('successResponse', () => {
  it('returns 200 with success:true and wrapped data', () => {
    const res = makeRes();
    successResponse(res, { id: '1', name: 'Test' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: { id: '1', name: 'Test' },
    });
  });

  it('accepts custom status code and message', () => {
    const res = makeRes();
    successResponse(res, null, 'Created', 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Created', success: true })
    );
  });

  it('wraps null data correctly', () => {
    const res = makeRes();
    successResponse(res, null);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: null, success: true })
    );
  });

  it('wraps array data correctly', () => {
    const res = makeRes();
    successResponse(res, [1, 2, 3]);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: [1, 2, 3] })
    );
  });
});

describe('errorResponse', () => {
  it('returns 400 with success:false by default', () => {
    const res = makeRes();
    errorResponse(res, 'Something went wrong');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Something went wrong',
    });
  });

  it('uses custom status code', () => {
    const res = makeRes();
    errorResponse(res, 'Not found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('includes errors object when provided', () => {
    const res = makeRes();
    errorResponse(res, 'Validation failed', 422, { email: ['Invalid email'] });
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      errors: { email: ['Invalid email'] },
    });
  });

  it('omits errors key when not provided', () => {
    const res = makeRes();
    errorResponse(res, 'Oops', 500);
    const call = res.json.mock.calls[0][0];
    expect(call).not.toHaveProperty('errors');
  });
});

describe('paginatedResponse', () => {
  it('returns correct pagination metadata', () => {
    const res = makeRes();
    paginatedResponse(res, ['a', 'b', 'c'], 53, 2, 10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: ['a', 'b', 'c'],
        total: 53,
        page: 2,
        limit: 10,
        totalPages: 6,
      })
    );
  });

  it('calculates totalPages correctly when total is exact multiple of limit', () => {
    const res = makeRes();
    paginatedResponse(res, [], 20, 1, 10);
    const call = res.json.mock.calls[0][0];
    expect(call.totalPages).toBe(2);
  });

  it('calculates totalPages with remainder (ceiling)', () => {
    const res = makeRes();
    paginatedResponse(res, [], 21, 1, 10);
    const call = res.json.mock.calls[0][0];
    expect(call.totalPages).toBe(3);
  });

  it('returns totalPages 0 when total is 0', () => {
    const res = makeRes();
    paginatedResponse(res, [], 0, 1, 20);
    const call = res.json.mock.calls[0][0];
    expect(call.totalPages).toBe(0);
  });
});
