'use client';

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { apiClient } from '@/lib/api/client';
import { getApiBaseUrl } from '@/lib/env';
import { useAuthStore } from '@/lib/store/auth';
import { useOrgStore } from '@/lib/store/org';
import type { TokenResponse } from '@/lib/types/auth';

// A bare client with no interceptors — used for the refresh call itself, so a
// failed refresh can't recursively trigger another refresh attempt.
const bareClient = axios.create({ baseURL: getApiBaseUrl(), withCredentials: true });

let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = bareClient
      .post<TokenResponse>('/auth/refresh')
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function extractOrgSlug(url: string | undefined): string | null {
  return url?.match(/\/orgs\/([^/]+)/)?.[1] ?? null;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// Attaches the bearer token to every request, transparently refreshes once on a
// 401, and re-mints the token for the right org on a 403 caused by an org
// mismatch. Mount once near the root, inside the query provider.
export function useSetupAxios() {
  const router = useRouter();

  useEffect(() => {
    const requestId = apiClient.interceptors.request.use((config) => {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    });

    const responseId = apiClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RetryableConfig | undefined;

        if (!config || config._retried) {
          if (error.response?.status === 401) {
            useAuthStore.getState().clear();
            router.replace('/login');
          }
          return Promise.reject(error);
        }

        if (error.response?.status === 401) {
          config._retried = true;
          try {
            const token = await refreshAccessToken();
            config.headers.set('Authorization', `Bearer ${token}`);
            return apiClient.request(config);
          } catch (refreshError) {
            useAuthStore.getState().clear();
            router.replace('/login');
            return Promise.reject(refreshError);
          }
        }

        if (error.response?.status === 403) {
          const requestOrgSlug = extractOrgSlug(config.url);
          const currentOrgSlug = useOrgStore.getState().currentOrgSlug;
          if (requestOrgSlug && requestOrgSlug !== currentOrgSlug) {
            config._retried = true;
            const { data } = await apiClient.post<TokenResponse>(`/orgs/${requestOrgSlug}/switch`);
            useAuthStore.getState().setAccessToken(data.accessToken);
            useOrgStore.getState().setCurrentOrgSlug(requestOrgSlug);
            config.headers.set('Authorization', `Bearer ${data.accessToken}`);
            return apiClient.request(config);
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      apiClient.interceptors.request.eject(requestId);
      apiClient.interceptors.response.eject(responseId);
    };
  }, [router]);
}
