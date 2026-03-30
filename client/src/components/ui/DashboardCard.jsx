export default function DashboardCard({ title, value, icon: Icon, trend, trendLabel, colorClass = "text-primary" }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-3xl font-bold text-foreground mt-2">{value}</h3>
          
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
              <span className="text-xs text-muted-foreground ml-2">{trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-full bg-muted/50 ${colorClass}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
