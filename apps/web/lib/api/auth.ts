import { apiClient } from '@/lib/api/client';
import type { LoginResponse } from '@/lib/types/auth';

export async function login(input: { email: string; password: string }): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', input);
  return data;
}

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<void> {
  await apiClient.post('/auth/register', input);
}

export async function forgotPassword(input: { email: string }): Promise<void> {
  await apiClient.post('/auth/forgot-password', input);
}

export async function resetPassword(input: { token: string; newPassword: string }): Promise<void> {
  await apiClient.post('/auth/reset-password', input);
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
