import { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { fetchReferrals, formatFetchError, normalizeDashboardData, normalizeReferralDetail, signIn } from './api';

const COOKIE_OPTIONS = { path: '/' };
const REFERRALS_PER_PAGE = 10;

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return String(value).replaceAll('-', '/');
}

function formatCurrency(value) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getToken() {
  return Cookies.get('jwt_token');
}

function ProtectedRoute() {
  return getToken() ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  return getToken() ? <Navigate to="/" replace /> : children;
}

function AppShell({ children, onLogout }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand-link" to="/" aria-label="Go to dashboard home">
          Go Business
        </Link>
        <nav className="main-nav" aria-label="Primary">
          <Link to="/">Home</Link>
          <button type="button" className="logout-button" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>
      <main className="page-content">{children}</main>
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">Go Business</div>
      <nav className="footer-nav" aria-label="Footer">
        <a href="#about">About</a>
        <a href="#privacy">Privacy</a>
      </nav>
      <p>© 2026 Go Business</p>
    </footer>
  );
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="copy-button" onClick={handleCopy}>
      Copy
      <span className="sr-only"> {copied ? 'copied' : ''}</span>
    </button>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const token = await signIn(email, password);
      Cookies.set('jwt_token', token, COOKIE_OPTIONS);
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(formatFetchError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="eyebrow">Go Business</div>
        <h1>Sign in</h1>
        <p>Sign in to open your referral dashboard.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            Sign in
          </button>
        </form>
      </div>
    </section>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState({ metrics: [], serviceSummary: {}, referral: {}, referrals: [] });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const payload = await fetchReferrals(getToken(), { search, sort });
        if (!active) return;
        setDashboard(normalizeDashboardData(payload));
      } catch (loadError) {
        if (!active) return;
        setError(formatFetchError(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [search, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  const visibleReferrals = useMemo(() => {
    const startIndex = (page - 1) * REFERRALS_PER_PAGE;
    return dashboard.referrals.slice(startIndex, startIndex + REFERRALS_PER_PAGE);
  }, [dashboard.referrals, page]);

  const totalPages = Math.max(1, Math.ceil(dashboard.referrals.length / REFERRALS_PER_PAGE));
  const startEntry = dashboard.referrals.length === 0 ? 0 : (page - 1) * REFERRALS_PER_PAGE + 1;
  const endEntry = Math.min(page * REFERRALS_PER_PAGE, dashboard.referrals.length);

  function handleLogout() {
    Cookies.remove('jwt_token', COOKIE_OPTIONS);
    navigate('/login', { replace: true });
  }

  function handleRowActivate(id) {
    navigate(`/referral/${id}`);
  }

  return (
    <AppShell onLogout={handleLogout}>
      <section className="hero-card">
        <div>
          <h1>Referral Dashboard</h1>
          <p>Track your referrals, earnings, and partner activity in one place.</p>
        </div>
      </section>

      <section className="panel" aria-label="Overview metrics" role="region">
        <h2>Overview</h2>
        {loading ? <div className="status-note">Loading dashboard…</div> : null}
        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}
        <div className="metric-grid">
          {dashboard.metrics.map((metric) => (
            <article className="metric-card" key={metric.id || metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-label="Service summary">
        <h2>Service summary</h2>
        <dl className="summary-list">
          <div>
            <dt>Service</dt>
            <dd>{dashboard.serviceSummary.service || '—'}</dd>
          </div>
          <div>
            <dt>Your Referrals</dt>
            <dd>{dashboard.serviceSummary.yourReferrals || '—'}</dd>
          </div>
          <div>
            <dt>Active Referrals</dt>
            <dd>{dashboard.serviceSummary.activeReferrals || '—'}</dd>
          </div>
          <div>
            <dt>Total Ref. Earnings</dt>
            <dd>{dashboard.serviceSummary.totalRefEarnings || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-label="Share referral">
        <h2>Refer friends and earn more</h2>
        <div className="share-grid">
          <div>
            <label htmlFor="referral-link">Your Referral Link</label>
            <div className="share-control">
              <input id="referral-link" type="text" readOnly value={dashboard.referral.link || ''} />
              <CopyButton value={dashboard.referral.link || ''} />
            </div>
          </div>
          <div>
            <label htmlFor="referral-code">Your Referral Code</label>
            <div className="share-control">
              <input id="referral-code" type="text" readOnly value={dashboard.referral.code || ''} />
              <CopyButton value={dashboard.referral.code || ''} />
            </div>
          </div>
        </div>
      </section>

      <section className="panel" aria-label="All referrals">
        <div className="table-toolbar">
          <h2>All referrals</h2>
          <div className="table-controls">
            <label className="search-label" htmlFor="search-referrals">
              <span>Search referrals</span>
              <input
                id="search-referrals"
                type="search"
                placeholder="Name or service…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search referrals"
              />
            </label>
            <label className="sort-label" htmlFor="sort-referrals">
              Sort by date
              <select
                id="sort-referrals"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Service</th>
                <th>Date</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {!loading && visibleReferrals.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    No matching entries
                  </td>
                </tr>
              ) : null}
              {visibleReferrals.map((referral) => (
                <tr
                  key={referral.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowActivate(referral.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleRowActivate(referral.id);
                    }
                  }}
                >
                  <td>{referral.name}</td>
                  <td>{referral.serviceName}</td>
                  <td>{formatDate(referral.date)}</td>
                  <td>{formatCurrency(referral.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <p>
            Showing {startEntry}–{endEntry} of {dashboard.referrals.length} entries
          </p>
          <div className="pagination">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
              Previous
            </button>
            {totalPages > 1
              ? Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={pageNumber === page ? 'page-button active' : 'page-button'}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))
              : null}
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </AppShell>
  );
}

function ReferralDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [referral, setReferral] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      setNotFound(false);

      try {
        const payload = await fetchReferrals(getToken(), { id });
        if (!active) return;

        const match = normalizeReferralDetail(payload, id);

        if (!match) {
          setNotFound(true);
        } else {
          setReferral(match);
        }
      } catch (loadError) {
        if (!active) return;

        const message = formatFetchError(loadError);
        if (/\b404\b/.test(message)) {
          setNotFound(true);
        } else {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  function handleLogout() {
    Cookies.remove('jwt_token', COOKIE_OPTIONS);
    navigate('/login', { replace: true });
  }

  return (
    <AppShell onLogout={handleLogout}>
      <section className="panel detail-panel">
        {loading ? <div className="status-note">Loading referral…</div> : null}
        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        {!loading && notFound ? (
          <div className="not-found-inline">
            <h1>Referral not found</h1>
            <p>The referral you requested could not be loaded.</p>
            <Link className="primary-link" to="/">
              Back to dashboard
            </Link>
          </div>
        ) : null}

        {!loading && referral ? (
          <article>
            <div className="detail-header">
              <h1>Referral Details</h1>
              <Link className="back-link" to="/">
                ← Back to dashboard
              </Link>
            </div>
            <h2>{referral.name}</h2>
            <dl className="detail-list">
              <div>
                <dt>Referral ID</dt>
                <dd>{referral.id}</dd>
              </div>
              <div>
                <dt>Service Name</dt>
                <dd>{referral.serviceName}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(referral.date)}</dd>
              </div>
              <div>
                <dt>Profit</dt>
                <dd>{formatCurrency(referral.profit)}</dd>
              </div>
            </dl>
          </article>
        ) : null}
      </section>
    </AppShell>
  );
}

function NotFoundPage() {
  return (
    <section className="auth-page not-found-page">
      <div className="auth-card">
        <div className="eyebrow">404</div>
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link className="primary-link" to="/">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard/referrals" element={<Navigate to="/" replace />} />
          <Route path="/referral/:id" element={<ReferralDetailPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
