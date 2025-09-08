'use client';

export default function WalletPoints() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-gray-900">Wallet Points</h3>
      <div className="grid grid-cols-3 divide-x rounded-xl border">
        {[
          { label: 'Total', value: 0 },
          { label: 'Used', value: 0 },
          { label: 'Available', value: 0 },
        ].map((x) => (
          <div key={x.label} className="p-4 text-center">
            <div className="text-lg font-semibold">{x.value}</div>
            <div className="text-xs text-gray-500">{x.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
