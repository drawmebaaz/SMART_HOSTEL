import type {
  Complaint,
  ComplaintSubmissionResponse,
  DashboardSummary,
  IssueDetail,
  IssueStatus,
  IssueSummary,
  User,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = response.statusText
    try {
      const body = await response.json()
      message = body.detail ?? body.message ?? message
    } catch {
      // Keep status text when the response is not JSON.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export const api = {
  register: (payload: { email: string; name: string; password: string }) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/auth/me'),
  submitComplaint: (payload: { text: string; hostel: string; metadata?: Record<string, unknown> }) =>
    request<ComplaintSubmissionResponse>('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  myComplaints: () => request<Complaint[]>('/complaints/me'),
  dashboard: () => request<DashboardSummary>('/admin/dashboard'),
  issues: (params: URLSearchParams) => request<IssueSummary[]>(`/admin/issues?${params}`),
  issue: (id: string) => request<IssueDetail>(`/admin/issues/${id}`),
  updateIssueStatus: (id: string, status: IssueStatus, notes?: string) =>
    request<IssueSummary>(`/admin/issues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
}

export const oauthProvider = import.meta.env.VITE_OAUTH_PROVIDER as string | undefined
export const oauthStartUrl = oauthProvider ? `${API_BASE_URL}/auth/oauth/${oauthProvider}/start` : null
