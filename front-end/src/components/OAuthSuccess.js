import { useEffect } from 'react';
import safeLocalStorage from '../utils/localStorage';

function OAuthSuccess() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const userJson = params.get('user');
      const provider = params.get('provider');

      if (token && userJson) {
        safeLocalStorage.setItem('token', token);
        try {
          const user = JSON.parse(userJson);
          safeLocalStorage.setItem('user', JSON.stringify(user));
        } catch (_) {}
        // redirect to dashboard (root)
        window.location.replace('/');
      } else {
        // fallback to login if something missing
        window.location.replace('/');
      }
    } catch (_) {
      window.location.replace('/');
    }
  }, []);

  return null;
}

export default OAuthSuccess;


