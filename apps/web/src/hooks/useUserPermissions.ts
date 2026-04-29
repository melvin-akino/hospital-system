import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface PermissionEntry {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export const ALL_MODULES = [
  { key: 'clinical',        label: 'Clinical / EMR' },
  { key: 'billing',         label: 'Billing' },
  { key: 'pharmacy',        label: 'Pharmacy' },
  { key: 'laboratory',      label: 'Laboratory' },
  { key: 'radiology',       label: 'Radiology' },
  { key: 'nursing',         label: 'Nursing' },
  { key: 'admissions',      label: 'Admissions' },
  { key: 'queue',           label: 'Queue Management' },
  { key: 'appointments',    label: 'Appointments' },
  { key: 'telemedicine',    label: 'Telemedicine' },
  { key: 'hmo',             label: 'HMO Processing' },
  { key: 'philhealth',      label: 'PhilHealth' },
  { key: 'accounting',      label: 'Accounting' },
  { key: 'analytics',       label: 'Analytics' },
  { key: 'assets',          label: 'Asset Management' },
  { key: 'bloodbank',       label: 'Blood Bank' },
  { key: 'dialysis',        label: 'Dialysis' },
  { key: 'or',              label: 'Operating Room' },
  { key: 'doh',             label: 'DOH Reporting' },
  { key: 'hie',             label: 'HIE / Interoperability' },
  { key: 'sms',             label: 'SMS Notifications' },
  { key: 'dept-charges',    label: 'Department Charges' },
  { key: 'ai',              label: 'AI Decision Support' },
];

export function useUserPermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () =>
      api.get(`/users/${userId}/permissions`).then((r) => r.data.data as PermissionEntry[]),
    enabled: !!userId,
  });
}

export function useSetUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: PermissionEntry[] }) =>
      api.put(`/users/${userId}/permissions`, { permissions }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['user-permissions', vars.userId] });
    },
  });
}
