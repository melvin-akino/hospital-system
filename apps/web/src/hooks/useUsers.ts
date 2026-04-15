import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, CreateUserPayload, UpdateUserPayload } from '../services/userService';
import { message } from 'antd';

export const useUsers = (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
  useQuery({ queryKey: ['users', params], queryFn: () => userService.list(params) });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserPayload) => userService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); message.success('User created'); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e.response?.data?.message || 'Failed to create user'),
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) => userService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); message.success('User updated'); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e.response?.data?.message || 'Failed to update user'),
  });
};

export const useToggleUserStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.toggleStatus(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); message.success('Status updated'); },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); message.success('User deleted'); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e.response?.data?.message || 'Failed to delete user'),
  });
};
