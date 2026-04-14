import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../services/appointmentService';
import { App } from 'antd';

export const useAppointments = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['appointments', params],
    queryFn: () => appointmentService.getAppointments(params),
  });

export const useAppointment = (id: string) =>
  useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentService.getAppointment(id),
    enabled: !!id,
  });

export const useTodayAppointments = () =>
  useQuery({
    queryKey: ['appointments-today'],
    queryFn: () => appointmentService.getTodayAppointments(),
    refetchInterval: 60000,
  });

export const useDoctorAvailability = (doctorId: string, date: string) =>
  useQuery({
    queryKey: ['doctor-availability', doctorId, date],
    queryFn: () => appointmentService.getDoctorAvailability(doctorId, date),
    enabled: !!doctorId && !!date,
  });

export const useCreateAppointment = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: {
      patientId: string;
      doctorId?: string;
      serviceId?: string;
      scheduledAt: string;
      duration?: number;
      notes?: string;
    }) => appointmentService.createAppointment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-today'] });
      message.success('Appointment booked successfully');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to book appointment';
      message.error(msg);
    },
  });
};

export const useUpdateAppointment = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      appointmentService.updateAppointment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      message.success('Appointment updated');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update appointment';
      message.error(msg);
    },
  });
};

export const useCancelAppointment = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => appointmentService.cancelAppointment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-today'] });
      message.success('Appointment cancelled');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to cancel appointment';
      message.error(msg);
    },
  });
};
