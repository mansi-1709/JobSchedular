import { signToken, verifyToken, JWTPayload } from '../../backend/src/utils/jwt';

describe('JWT Utility', () => {
  const mockPayload: JWTPayload = {
    userId: 'usr_123456',
    email: 'test@example.com',
    orgId: 'org_987654',
    role: 'ADMIN',
  };

  it('should sign a token and verify it correctly', () => {
    const token = signToken(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(mockPayload.userId);
    expect(decoded.email).toBe(mockPayload.email);
    expect(decoded.orgId).toBe(mockPayload.orgId);
    expect(decoded.role).toBe(mockPayload.role);
  });

  it('should throw an error when verifying an invalid token', () => {
    expect(() => {
      verifyToken('invalid.token.structure');
    }).toThrow();
  });

  it('should throw an error when token signature is tampered', () => {
    const token = signToken(mockPayload);
    const tampered = token.slice(0, -5) + 'abcde';
    expect(() => {
      verifyToken(tampered);
    }).toThrow();
  });
});
