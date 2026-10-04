export function SkeletonTile() {
  return (
    <div
      className="tile skeleton-shimmer"
      style={{
        border: '1px solid var(--line)',
        opacity: 0.7,
        cursor: 'default',
      }}
    >
      <div style={{ width: '34px', height: '34px', borderRadius: '12px', background: 'var(--tick-off)' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ height: '14px', width: '60%', borderRadius: '4px', background: 'var(--tick-off)' }} />
        <div style={{ height: '8px', width: '35%', borderRadius: '4px', background: 'var(--tick-off)' }} />
      </div>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--tick-off)' }} />
    </div>
  )
}

export function SkeletonDialPanel() {
  return (
    <aside className="panel" aria-label="Loading challenge progress">
      <div className="brand">
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)' }} />
        <div>
          <b>Winter Arc</b>
          <span>90-day challenge</span>
        </div>
      </div>
      <div className="dialwrap" style={{ display: 'grid', placeItems: 'center' }}>
        <div
          style={{
            width: '80%',
            height: '80%',
            borderRadius: '50%',
            border: '8px solid rgba(255,255,255,0.08)',
          }}
        />
      </div>
      <div className="today-pct">Loading challenge telemetry...</div>
      <div className="stats">
        {[0, 1, 2].map(i => (
          <div key={i} className="stat">
            <div style={{ height: '12px', width: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '4px' }} />
            <div style={{ height: '22px', width: '50px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
      <div className="panelfoot">
        <span>Connecting...</span>
      </div>
    </aside>
  )
}
