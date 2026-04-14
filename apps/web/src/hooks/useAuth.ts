import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { App } from 'antd';

export const useLogin = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authService.login(username, password),
    onSuccess: (data) => {
      if (data.success && data.data) {
        login(data.data.user, data.data.token);
        message.success('Login successful');
        navigate('/dashboard');
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid credentials';
      message.error(msg);
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      logout();
      navigate('/login');
      message.success('Logged out');
    },
  });
};
