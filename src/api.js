const BASE_URL = 'https://v9fes04dwf.execute-api.eu-north-1.amazonaws.com/api/referrals';
const LOGIN_URL = 'https://v9fes04dwf.execute-api.eu-north-1.amazonaws.com/api/auth/signin';

async function parseJson(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function buildErrorMessage(response, payload, fallback) {
  const message = payload?.message || payload?.error || payload?.data?.message || fallback || 'Request failed';
  return response.status ? `${message} (${response.status})` : message;
}

function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function signIn(email, password) {
  const response = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || 'Invalid email or password');
  }

  const token = payload?.data?.token;

  if (!token) {
    throw new Error('Invalid login response');
  }

  return token;
}

export async function fetchReferrals(token, params = {}) {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.sort) {
    searchParams.set('sort', params.sort);
  }

  if (params.id !== undefined && params.id !== null && params.id !== '') {
    searchParams.set('id', String(params.id));
  }

  const queryString = searchParams.toString();
  const response = await fetch(queryString ? `${BASE_URL}?${queryString}` : BASE_URL, {
    headers: getAuthHeaders(token),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(buildErrorMessage(response, payload, 'Failed to load referrals'));
  }

  return payload?.data ?? payload ?? {};
}

export function normalizeDashboardData(payload) {
  const data = payload?.data ?? payload ?? {};

  return {
    metrics: Array.isArray(data.metrics) ? data.metrics : [],
    serviceSummary: data.serviceSummary ?? {},
    referral: data.referral ?? {},
    referrals: Array.isArray(data.referrals) ? data.referrals : [],
  };
}

export function normalizeReferralDetail(payload, requestedId) {
  const data = payload?.data ?? payload ?? {};

  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (String(data.id) === String(requestedId) || String(data.referralId) === String(requestedId))
  ) {
    return data;
  }

  const referrals = Array.isArray(data.referrals) ? data.referrals : Array.isArray(payload?.referrals) ? payload.referrals : [];
  return referrals.find((entry) => String(entry?.id) === String(requestedId)) || null;
}

export function formatFetchError(error) {
  return error instanceof Error ? error.message : 'Request failed';
}
