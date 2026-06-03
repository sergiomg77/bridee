import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { apiFetch } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface AdminUser {
  id: string;
  email: string | undefined;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const ROLE_BADGE: Record<string, string> = {
  bride:    'bg-gray-100 text-gray-600',
  boutique: 'bg-blue-50 text-blue-700',
  vendor:   'bg-[#C9A96E]/15 text-[#b8945a]',
  admin:    'bg-red-50 text-red-700',
};

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect('/login');
  }

  const admin = createAdminClient();

  const [usersRes, rolesRes] = await Promise.all([
    apiFetch<{ data: AdminUser[] | null; error: string | null }>(
      '/api/admin/users',
      {},
      session.access_token,
    ),
    admin.from('user_roles').select('user_id, role'),
  ]);

  const users = usersRes.data?.data ?? [];

  const rolesMap = new Map<string, string[]>();
  for (const row of (rolesRes.data ?? []) as UserRole[]) {
    const existing = rolesMap.get(row.user_id) ?? [];
    existing.push(row.role);
    rolesMap.set(row.user_id, existing);
  }

  return (
    <AdminLayout title="Users">
      <div className="p-6">
        {usersRes.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
            {usersRes.error}
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Roles</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">User ID</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => {
                const roles = rolesMap.get(u.id) ?? [];
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-800">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      {roles.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {roles.map((role) => (
                            <span
                              key={role}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600'}`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.id}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
