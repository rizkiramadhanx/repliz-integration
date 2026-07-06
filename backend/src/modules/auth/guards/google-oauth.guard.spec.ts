import { GoogleOauthGuard } from './google-oauth.guard';

describe('AuthGuard', () => {
  it('should be defined', () => {
    expect(new GoogleOauthGuard()).toBeDefined();
  });
});
