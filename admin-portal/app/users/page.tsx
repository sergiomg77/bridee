import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { apiFetch } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

interface AdminUser {
  id: string;
  email: string | undefined;
  created_at: string;
}

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data, error } = await apiFetch<{ data: AdminUser[] | null; error: string | null }>(
    '/api/admin/users',
    {},
    session.access_token,
  );

  const users = data?.data ?? [];

  return (
    <AdminLayout title="Users">
      <div className="p-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">User ID</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-800">{u.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
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
