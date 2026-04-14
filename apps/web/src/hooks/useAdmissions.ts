import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admissionService } from '../services/admissionService';
import { App } from 'antd';

export const useAdmissionStats = () =>
  useQuery({
    queryKey: ['admission-stats'],
    queryFn: () => admissionService.getStats(),
    refetchInterval: 30000,
  });

export const useRooms = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['rooms', params],
    queryFn: () => admissionService.getRooms(params),
  });

export const useRoomTypes = () =>
  useQuery({
    queryKey: ['room-types'],
    queryFn: () => admissionService.getRoomTypes(),
  });

export const useAdmissions = (params?: Record<string, string | number | undefined>) =>
  useQuery({
    queryKey: ['admissions', params],
    queryFn: () => admissionService.getAdmissions(params),
  });

export const useAdmission = (id: string) =>
  useQuery({
    queryKey: ['admission', id],
    queryFn: () => admissionService.getAdmission(id),
    enabled: !!id,
  });

export const useCreateAdmission = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: admissionService.createAdmission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['admission-stats'] });
      message.success('Patient admitted successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to admit patient';
      message.error(msg);
    },
  });
};

export const useDischargePatient = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { dischargeNotes?: string; dischargedAt?: string } }) =>
      admissionService.discharge(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['admission', variables.id] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['admission-stats'] });
      message.success('Patient discharged successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to discharge patient';
      message.error(msg);
    },
  });
};

export const useCreateRoom = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: admissionService.createRoom,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['admission-stats'] });
      message.success('Room created');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create room';
      message.error(msg);
    },
  });
};
