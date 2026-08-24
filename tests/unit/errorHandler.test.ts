import { Request, Response } from 'express';
import { createError, errorHandler, notFound, AppError } from '../../backend/src/middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test-endpoint',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('createError', () => {
    it('should create an AppError with custom status code and message', () => {
      const err = createError(404, 'Resource not found');
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Resource not found');
      expect(err.isOperational).toBe(true);
    });
  });

  describe('errorHandler', () => {
    it('should handle operational AppError correctly', () => {
      const error: AppError = createError(400, 'Bad Request Data');
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Bad Request Data',
            statusCode: 400,
            path: '/test-endpoint',
          }),
        }),
      );
    });

    it('should mask internal unhandled error messages with 500', () => {
      const genericError = new Error('Database password leak or internal bug');
      errorHandler(genericError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Internal server error',
            statusCode: 500,
            path: '/test-endpoint',
          }),
        }),
      );
    });
  });

  describe('notFound', () => {
    it('should return 404 with route information', () => {
      notFound(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Route GET /test-endpoint not found',
            statusCode: 404,
          }),
        }),
      );
    });
  });
});
