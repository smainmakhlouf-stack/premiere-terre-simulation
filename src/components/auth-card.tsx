export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-premiere-terre.png" alt="" />
          <h1>Première Terre Finance</h1>
          <p>Simulateur de financement · espace vendeurs</p>
        </div>
        <div className="auth-body">{children}</div>
      </div>
    </main>
  )
}
