import axios from 'axios';

import { getApiBaseUrl } from '@/lib/env';

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});
