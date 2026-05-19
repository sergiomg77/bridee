import PortalLayout from '@/components/PortalLayout';

export default function PackagesPage() {
  return (
    <PortalLayout title="Packages">
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#C9A96E]/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">📦</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Packages Coming Soon</h2>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          Create and manage service packages for brides — including fittings, alterations, and styling sessions.
          This feature is on the way.
        </p>
      </div>
    </PortalLayout>
  );
}
