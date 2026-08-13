    return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl p-5 text-white shadow-2xl"
      style={{
        background:
          "linear-gradient(135deg, hsl(43 96% 40%) 0%, hsl(38 92% 55%) 50%, hsl(28 84% 45%) 100%)",
      }}
    >
      {/* Decorative shine */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-black/20 blur-3xl" />

      {/* Top row */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-black tracking-tight">A Pro</div>
          <span className="text-[10px] uppercase tracking-widest bg-black/25 rounded-full px-2 py-0.5">
            Membership
          </span>
        </div>
        <Crown className="w-6 h-6 opacity-90" />
      </div>

      {/* Body */}
      <div className="relative flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-full ring-2 ring-white/60 overflow-hidden bg-white/20 backdrop-blur shrink-0">
          <img
            src={avatarUrl || appIcon}
            alt={fullName}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-widest opacity-80">Card Holder</p>
          <p className="text-lg font-bold truncate">{fullName}</p>
          {badge && (
            <div
              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: "rgba(0,0,0,0.28)", color: "#fff" }}
            >
              <span>{badge.icon}</span>
              <span>{badge.name}</span>
            </div>
          )}
        </div>
      </div>

