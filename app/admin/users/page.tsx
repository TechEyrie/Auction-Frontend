'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { Badge, GhostButton, PageHeader, Panel, StateBlock, TableWrap } from '../ui';

type AdminUser = {
  publicReference: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'suspended' | 'disabled';
  roles: string[];
};

export default function AdminUsersPage() {
  const session = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await apiFetch<{ users: AdminUser[] }>('/api/admin/users', { cache: 'no-store', headers: session.authHeaders() });
      setUsers(body.users);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.body.message : 'Users could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session.capabilities.includes('users.view')) return;
    void load();
  }, [load, session.capabilities]);

  const mayManage = session.capabilities.includes('users.manage');

  async function setStatus(user: AdminUser, status: AdminUser['status']) {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/users/${user.publicReference}/status`, {
        method: 'PATCH',
        headers: session.authHeaders(),
        json: { status, reason: status === 'active' ? 'Restored from the users screen' : 'Suspended from the users screen' },
      });
      setNotice(`${user.fullName} is now ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.body.message : 'The status change was refused');
    }
  }

  if (!session.capabilities.includes('users.view')) {
    return <p>This account cannot view users.</p>;
  }

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader title="Users" subtitle="Accounts on this server. Suspending someone stops them signing in." />

      <Panel title="All accounts" actions={<GhostButton onClick={() => void load()}>Reload</GhostButton>}>
        {error && <p role="alert" className="adm-note" data-tone="bad">{error}</p>}
        {notice && <p role="status" className="adm-note" data-tone="good">{notice}</p>}

        <StateBlock loading={loading} error={null} empty={users.length === 0} emptyText="No users found." onRetry={load}>
          <TableWrap label="Users">
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Status</th>
                  <th scope="col">Access</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.publicReference}>
                    <td style={css('font-weight: 600')}>{user.fullName}</td>
                    <td>{user.email ?? user.phone ?? '—'}</td>
                    <td>
                      <Badge tone={user.status === 'active' ? 'good' : 'warn'}>{user.status}</Badge>
                    </td>
                    <td>{user.roles.includes('customer') && user.roles.length === 1 ? 'Customer' : 'Admin'}</td>
                    <td>
                      {mayManage && user.publicReference !== session.user?.publicReference && (
                        <button type="button" className="adm-link-btn" onClick={() => void setStatus(user, user.status === 'active' ? 'suspended' : 'active')}>
                          {user.status === 'active' ? 'Suspend' : 'Restore'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </StateBlock>
      </Panel>
    </div>
  );
}
