export default function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-100">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
