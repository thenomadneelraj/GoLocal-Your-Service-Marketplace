export default function ClientNotifications() {
  const items = [
    { id: 1, title: "Booking Confirmed", detail: "Your booking is confirmed for 10:00 AM." },
    { id: 2, title: "Provider Arriving", detail: "Your provider will arrive in 20 minutes." },
    { id: 3, title: "Payment Confirmed", detail: "Payment for last booking has been received." },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Notifications</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-slate-200 rounded-lg p-4">
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-slate-600">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
