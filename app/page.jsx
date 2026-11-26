import { loggedIn } from "../lib/auth";
import { getSnapshot } from "../lib/snapshot";

export const dynamic = "force-dynamic";

const STATUS = { running: "running", off: "off", stop_file: "STOP file", duplicate: "2 copies running" };

const money = (x) => (x == null ? "–" : `${x < 0 ? "-" : "+"}$${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const usd = (x) => (x == null ? "–" : `$${Number(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const cls = (x) => (x == null || x === 0 ? "" : x > 0 ? "up" : "down");
const ago = (m) => (m == null ? "no log" : m < 120 ? `${m} min ago` : m < 4320 ? `${(m / 60).toFixed(1)} h ago` : `${Math.round(m / 1440)} days ago`);

function Login({ error }) {
  return (
    <main className="login">
      <h1>Trading bots</h1>
      <p className="sub">Read-only dashboard. Enter your password.</p>
      <form method="post" action="/api/login">
        <input type="password" name="password" autoComplete="current-password" placeholder="Password" required autoFocus />
        {error && <div className="warn">Wrong password.</div>}
        <button className="btn primary" type="submit">Open dashboard</button>
      </form>
    </main>
  );
}

function Stat({ k, v, c = "" }) {
  return (
    <div className="card">
      <div className="k">{k}</div>
      <div className={`v ${c}`}>{v}</div>
    </div>
  );
}

// Tiny line chart: cumulative profit; zero line dashed.
function Spark({ points, label }) {
  if (!points || points.length < 2) return null;
  const ys = [0, ...points.map((p) => p[1])];
  const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const W = 600, H = 120, P = 6;
  const x = (i) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v) => H - P - ((v - lo) * (H - 2 * P)) / span;
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
  const last = points[points.length - 1][1];
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
         aria-label={`${label}: ${money(last)} from ${points[0][0]} to ${points[points.length - 1][0]}`}>
      <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke="var(--line)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke={last >= 0 ? "var(--up)" : "var(--down)"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Gold({ title, g }) {
  const s = g.stats, t = g.today || {};
  return (
    <>
      <h3>{title}</h3>
      {t.date && (
        <p className="note" style={{ marginTop: 0 }}>
          Today ({t.date}): {t.status} · buy stop <b>{t.buy_stop?.toFixed?.(2)}</b> / sell stop <b>{t.sell_stop?.toFixed?.(2)}</b> ·
          yesterday's range {t.prev_range?.toFixed?.(2)}
        </p>
      )}
      <div className="grid" style={{ marginTop: 8 }}>
        <Stat k="Closed trades" v={g.goal ? `${s.trades} / ${g.goal}` : s.trades} />
        <Stat k="Net" v={money(s.net)} c={cls(s.net)} />
        <Stat k="Won" v={s.win_pct == null ? "–" : `${s.win_pct}%`} />
        <Stat k="Worst" v={money(s.worst)} c={cls(s.worst)} />
      </div>
      <Spark points={g.curve} label={title} />
      {g.trades?.length > 0 && (
        <div className="table" style={{ marginTop: 8 }}>
          <table>
            <thead><tr><th>Date</th><th>Side</th><th className="n">Entry</th><th className="n">Exit</th><th className="n">Profit</th></tr></thead>
            <tbody>
              {g.trades.slice(0, 10).map((r, i) => (
                <tr key={i}><td>{r.date}</td><td>{r.side}</td><td className="n">{r.entry}</td><td className="n">{r.exit}</td>
                  <td className={`n ${cls(r.profit)}`}>{money(r.profit)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default async function Page({ searchParams }) {
  if (!(await loggedIn())) return <Login error={(await searchParams)?.e === "1"} />;
  const { snap: s, error } = await getSnapshot();
  if (!s) return <main className="wrap"><h1>Trading bots</h1><div className="err">No data yet. {error}</div></main>;

  const ageMin = Math.round((Date.now() - Date.parse(s.generated_utc.replace(" ", "T") + ":00Z")) / 60000);
  const running = s.bots.filter((b) => b.status === "running").length;
  const p = s.pool, m = s.main_bot || {};

  return (
    <main className="wrap">
      <header>
        <div>
          <h1>Trading bots</h1>
          <div className="sub">
            Data from the PC at {s.generated_nairobi} Nairobi{" "}
            <span className={ageMin > 45 ? "stale" : ""}>({ageMin} min ago{ageMin > 45 ? " — the PC may be off or not syncing" : ""})</span>
            {" "}· read-only
          </div>
        </div>
        <form method="post" action="/api/logout"><button className="btn" type="submit">Log out</button></form>
      </header>

      <nav>
        <a href="#overview">Overview</a><a href="#gold">Gold</a><a href="#ib">Inside bars</a><a href="#main">Main bot</a>
        <a href="#pool">Real pool</a><a href="#news">News</a>
      </nav>

      <h2 id="overview">Overview</h2>
      {s.warnings.map((w, i) => <div className="warn" key={i}>⚠️ {w}</div>)}
      <div className="grid">
        <Stat k="Bots running" v={`${running} / ${s.bots.length}`} />
        <Stat k="MT5 terminal" v={s.mt5_up ? "up" : "DOWN"} c={s.mt5_up ? "" : "down"} />
        <Stat k="Real switch" v={p.real_switch ? "ON" : "off"} />
        <Stat k="Gold demo net" v={money(s.gold.demo.stats.net)} c={cls(s.gold.demo.stats.net)} />
      </div>
      <div className="table" style={{ marginTop: 10 }}>
        <table>
          <thead><tr><th>Bot</th><th>Status</th><th>Account</th><th>Last log</th></tr></thead>
          <tbody>
            {s.bots.map((b) => (
              <tr key={b.name}><td>{b.name}</td><td><span className={`dot s-${b.status}`} />{STATUS[b.status] || b.status}</td>
                <td>{b.account}</td><td>{ago(b.log_age_min)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">"Gold breakout REAL" stays off until you flip the real switch.</p>

      <h2 id="gold">Gold breakout</h2>
      <Gold title="Demo forward test · XAUUSD 0.01" g={s.gold.demo} />
      <Gold title="Rehearsal · XAUUSDmicro 0.1 (real bot settings, on the demo)" g={s.gold.rehearsal} />
      <p className="note">Frozen rules; judged after 100 demo trades. Trailing stop stays 1.5 / 0.75 (KB 133).</p>

      <h2 id="ib">Inside bar tests</h2>
      <div className="table">
        <table>
          <thead><tr><th>Test</th><th>Market</th><th className="n">Closed</th><th className="n">Net</th><th className="n">Won</th><th>Last event</th></tr></thead>
          <tbody>
            {s.inside_bars.map((t) => (
              <tr key={t.name}><td>{t.name}</td><td>{t.market}</td><td className="n">{t.stats.trades} / {t.goal}</td>
                <td className={`n ${cls(t.stats.net)}`}>{money(t.stats.net)}</td>
                <td className="n">{t.stats.win_pct == null ? "–" : `${t.stats.win_pct}%`}</td><td>{t.last_event || "–"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Each test is judged after 30 closed trades.</p>

      <h2 id="main">Main demo bot</h2>
      {m.stats && (
        <>
          <div className="grid">
            <Stat k="Closed trades" v={m.stats.trades} />
            <Stat k="Net (this bot's trades)" v={money(m.stats.net)} c={cls(m.stats.net)} />
            <Stat k="Saved equity peak" v={usd(m.peak_equity)} />
          </div>
          <Spark points={m.curve} label="Main demo bot" />
          {m.kill_note && <div className="warn">Demo kill switch would have triggered ({m.kill_note}). On the demo it only warns.</div>}
          <div className="table" style={{ marginTop: 8 }}>
            <table>
              <thead><tr><th>Strategy</th><th>Status</th><th className="n">Trades</th><th className="n">Net</th><th className="n">Avg R</th><th className="n">Won</th></tr></thead>
              <tbody>
                {m.strategies.map((r) => (
                  <tr key={r.name}><td>{r.name}</td><td>{r.status}</td><td className="n">{r.trades}</td>
                    <td className={`n ${cls(r.net)}`}>{money(r.net)}</td><td className="n">{r.avg_r ?? "–"}</td>
                    <td className="n">{r.win_pct == null ? "–" : `${r.win_pct}%`}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 id="pool">Real account pool</h2>
      <div className="grid">
        <Stat k={`Money in (KES ${p.kes_in.toLocaleString("en-US")})`} v={usd(p.usd_in)} />
        <Stat k="Kill switch: stop below" v={usd(p.kill_level)} />
        <Stat k="Daily loss cap" v={usd(p.daily_cap)} />
        <Stat k="Real switch" v={p.real_switch ? "ON" : "off"} />
      </div>
      {p.real_equity.length > 1
        ? <Spark points={p.real_equity} label="Real equity" />
        : <p className="note">Real equity appears once the real bot runs (it logs it hourly).</p>}
      <h3>Rehearsal pretend pool (since {p.rehearsal.since})</h3>
      <div className="grid">
        <Stat k="Pretend money in" v={usd(p.rehearsal.money_in)} />
        <Stat k="Balance after closed trades" v={usd(p.rehearsal.balance)} c={cls(p.rehearsal.balance - p.rehearsal.money_in)} />
        <Stat k="Its kill level" v={usd(p.rehearsal.kill_level)} />
      </div>

      <h2 id="news">News (next 3 days)</h2>
      {s.news.length ? (
        <div className="table">
          <table>
            <thead><tr><th>Nairobi</th><th>UTC</th><th>Release</th></tr></thead>
            <tbody>{s.news.map((n, i) => <tr key={i}><td>{n.nairobi}</td><td>{n.utc.slice(11)}</td><td>{n.kind}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <p className="note">No US or euro releases in the next 3 days.</p>}
    </main>
  );
}
