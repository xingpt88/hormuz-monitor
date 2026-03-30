import { useState, useEffect } from "react";

const FALLBACK_DATA = {
  phase: 4, phaseName: "CRISIS",
  vesselCount: 0, vesselNormal: 153,
  daysSinceClosure: 28, jpmBuffer: 0,
  brent: 114.75, brentChg: "+55% MTD",
  wti: 100.96, wtiChg: "+1.4%",
  gold: 4500, goldChg: "-19.6% from ATH",
  ttf: 58.7, vlcc: 580,
  insurance: "主要承保商全面撤出，战争险区域扩大至阿曼水域",
  scenarios: [
    { label: "快速解决 (2周内)", pct: 5, trend: "↓" },
    { label: "持续中断 (1-3月)", pct: 30, trend: "↓" },
    { label: "结构性升级 (3月+)", pct: 45, trend: "↑" },
    { label: "全面危机 (地面战)", pct: 20, trend: "↑" },
  ],
  thingsToWatch: [
    { icon: "⚫", text: "JPM 25天储存缓冲已耗尽，海湾产油国被迫减产" },
    { icon: "🇺🇸", text: "Trump接受FT采访称要'take the oil'，暗示地面行动" },
    { icon: "🚀", text: "也门胡塞武装向以色列发射导弹，局势进一步扩大" },
    { icon: "🇨🇳", text: "伊朗在海峡运营人民币'收费站'，中俄船只付费通行" },
    { icon: "📅", text: "Trump对伊朗重开海峡最后期限：4月6日" },
  ],
  situationSummary: "数据加载中...",
  timeline: [],
  vesselHistory: [
    { d: "2/27", v: 153 }, { d: "3/2", v: 0 }, { d: "3/5", v: 5 },
    { d: "3/8", v: 13 }, { d: "3/12", v: 2 }, { d: "3/15", v: 1 },
    { d: "3/20", v: 0 }, { d: "3/25", v: 0 }, { d: "3/28", v: 0 }, { d: "3/30", v: 0 },
  ],
  sources: [
    { name: "JMIC", status: "ok" }, { name: "Tasnim", status: "ok" },
    { name: "Fars News", status: "ok" }, { name: "Windward", status: "ok" },
    { name: "Kpler/AIS", status: "ok" }, { name: "CNBC", status: "ok" },
  ],
};

function useMonitorData() {
  const [data, setData] = useState(FALLBACK_DATA);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch("/data.json?" + Date.now())
      .then(r => { if (!r.ok) throw new Error("fetch failed"); return r.json(); })
      .then(d => { setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);
  return { data, loaded };
}

const tagColor = { ALERT: "#ef4444", EVENT: "#3b82f6", IRAN: "#a855f7", ATTACK: "#f97316", DIPLO: "#22c55e", MARKET: "#eab308", INTEL: "#06b6d4" };

function Clock({ label, tz, flag }) {
  const [t, setT] = useState("--:--");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, [tz]);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{flag} {label}</div>
      <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono',monospace", color: "#e5e7eb", fontWeight: 600 }}>{t}</div>
    </div>
  );
}

function VesselChart({ data }) {
  const [hover, setHover] = useState(null);
  const max = 160;
  const chartH = 140;
  const yTicks = [0, 40, 80, 120, 153];
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {/* Y axis - absolute positioned to match bar heights */}
      <div style={{ position: "relative", width: 36, height: chartH, marginRight: 6, marginBottom: 20 }}>
        {yTicks.map((t, i) => {
          const bottom = (t / max) * chartH;
          return (
            <span key={i} style={{
              position: "absolute", bottom: bottom - 5, right: 0,
              fontSize: 9, color: "#4b5563", fontFamily: "monospace", textAlign: "right",
            }}>{t}</span>
          );
        })}
      </div>
      {/* Chart area */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* Grid lines - absolute positioned to match Y ticks */}
        {yTicks.map((t, i) => {
          const bottom = (t / max) * chartH;
          return (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0, bottom: bottom + 20,
              borderBottom: t === 0 ? "1px solid #374151" : "1px dashed #1a1f2e",
              pointerEvents: "none",
            }} />
          );
        })}
        {/* Bar area */}
        <div style={{ display: "flex", alignItems: "flex-end", height: chartH, gap: 2, position: "relative" }}>
          {data.map((d, i) => {
            const h = (d.v / max) * 100;
            const hPx = (d.v / max) * chartH;
            const isHovered = hover === i;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", cursor: "pointer" }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                {/* Tooltip */}
                {isHovered && (
                  <div style={{
                    position: "absolute", bottom: hPx + 8, left: "50%", transform: "translateX(-50%)",
                    background: "#1f2937", border: "1px solid #374151", borderRadius: 6, padding: "4px 8px",
                    fontSize: 11, color: "#e5e7eb", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap", zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  }}>
                    <span style={{ color: d.v < 15 ? "#f97316" : "#34d399", fontWeight: 700 }}>{d.v}</span>
                    <span style={{ color: "#6b7280" }}> 艘/日</span>
                  </div>
                )}
                <div style={{
                  width: "100%", height: Math.max(hPx, 3), borderRadius: "3px 3px 0 0",
                  background: d.v < 15
                    ? isHovered ? "#ef4444" : "linear-gradient(to top, #7c2d12, #dc2626)"
                    : isHovered ? "#34d399" : "linear-gradient(to top, #064e3b, #059669)",
                  opacity: isHovered ? 1 : 0.85, transition: "opacity 0.15s",
                }} />
                <span style={{ fontSize: 9, color: isHovered ? "#e5e7eb" : "#6b7280", marginTop: 3, fontFamily: "monospace", transition: "color 0.15s" }}>{d.d}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScenarioBar({ label, pct, trend }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: "#d1d5db" }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: "monospace", color: pct > 30 ? "#f97316" : "#9ca3af", fontWeight: 600 }}>{pct}% {trend}</span>
      </div>
      <div style={{ height: 4, background: "#1f2937", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: pct > 30 ? "linear-gradient(90deg,#f97316,#ef4444)" : "linear-gradient(90deg,#6b7280,#9ca3af)", transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function SkillModal({ open, onClose }) {
  const [copied, setCopied] = useState(null);
  if (!open) return null;
  const copy = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: "28px 24px", maxWidth: 460, width: "92%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>🦞</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#e5e7eb" }}>Connect to AI Agent</span>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 20px", lineHeight: 1.5 }}>让你的 AI 助手实时获取霍尔木兹海峡危机情报</p>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#f97316", color: "#000", fontWeight: 700 }}>RECOMMENDED</span>
            <span style={{ fontSize: 13, color: "#d1d5db", fontWeight: 600 }}>对话安装</span>
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 8px" }}>复制下方咒语，粘贴到你的 OpenClaw 对话中，Agent 会自动安装</p>
          <div style={{ display: "flex", alignItems: "center", background: "#0a0f1a", border: "1px solid #1f2937", borderRadius: 8, padding: "10px 14px" }}>
            <code style={{ flex: 1, fontSize: 13, color: "#34d399", fontFamily: "'JetBrains Mono',monospace" }}>请安装 hormuz-monitor skill</code>
            <button onClick={() => copy("请安装 hormuz-monitor skill", "chat")} style={{ background: "none", border: "1px solid #374151", borderRadius: 6, padding: "4px 12px", color: copied === "chat" ? "#34d399" : "#9ca3af", fontSize: 11, cursor: "pointer" }}>{copied === "chat" ? "✓" : "Copy"}</button>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#374151", color: "#9ca3af", fontWeight: 600 }}>MANUAL</span>
            <span style={{ fontSize: 13, color: "#d1d5db", fontWeight: 600 }}>命令行安装</span>
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 8px" }}>在终端执行，Skill 会持久保存到本地</p>
          <div style={{ display: "flex", alignItems: "center", background: "#0a0f1a", border: "1px solid #1f2937", borderRadius: 8, padding: "10px 14px" }}>
            <code style={{ flex: 1, fontSize: 12, color: "#34d399", fontFamily: "'JetBrains Mono',monospace" }}>npx @xingpt/hormuz-monitor install</code>
            <button onClick={() => copy("npx @xingpt/hormuz-monitor install", "npx")} style={{ background: "none", border: "1px solid #374151", borderRadius: 6, padding: "4px 12px", color: copied === "npx" ? "#34d399" : "#9ca3af", fontSize: 11, cursor: "pointer" }}>{copied === "npx" ? "✓" : "Copy"}</button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6, padding: "10px 12px", background: "rgba(249,115,22,0.06)", borderRadius: 8, border: "1px solid rgba(249,115,22,0.15)" }}>
          <strong style={{ color: "#f97316" }}>⚠️ 安全提示</strong><br />
          安装后 Skill 会通过 web_search 和 web_fetch 访问外部信源获取实时数据。这是正常行为，请允许网络访问。
        </div>
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", padding: "9px 0", borderRadius: 8, border: "1px solid #1f2937", background: "transparent", color: "#6b7280", fontSize: 12, cursor: "pointer" }}>关闭</button>
      </div>
    </div>
  );
}

function Section({ title, tag, children, style: sx }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, overflow: "hidden", ...sx }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", gap: 8 }}>
        {tag && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "#1f2937", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.06em" }}>{tag}</span>}
        <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.04em" }}>{title}</span>
      </div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

export default function HormuzDashboard() {
  const [modal, setModal] = useState(false);
  const [tick, setTick] = useState(false);
  const { data: d, loaded } = useMonitorData();
  useEffect(() => { const i = setInterval(() => setTick(p => !p), 2000); return () => clearInterval(i); }, []);
  const phaseCol = { 1: "#22c55e", 2: "#eab308", 3: "#f97316", 4: "#ef4444" }[d.phase];

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#e5e7eb", fontFamily: "-apple-system,'Noto Sans SC',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet" />

      <div style={{ borderBottom: "1px solid #1f2937", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#f97316", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace" }}>HORMUZ BRIEFING</span>
          <div style={{ width: 1, height: 16, background: "#1f2937" }} />
          <span style={{ fontSize: 11, color: "#e5e7eb", padding: "2px 8px", borderRadius: 4, background: "#1f2937" }}>简报</span>
        </div>
        <button onClick={() => setModal(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 6, border: "none", background: "#f97316", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🦞 一键Skill</button>
      </div>

      <div style={{ borderBottom: "1px solid #1a1f2e", padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ textAlign: "center", borderRight: "1px solid #1f2937", paddingRight: 20 }}>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>📋 简报日期</div>
            <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono',monospace", color: "#f97316", fontWeight: 700 }}>
              {new Date().toLocaleDateString("en-CA", { timeZone: "UTC" })}
            </div>
          </div>
          <Clock label="Tehran" tz="Asia/Tehran" flag="🇮🇷" />
          <Clock label="New York" tz="America/New_York" flag="🇺🇸" />
          <Clock label="Beijing" tz="Asia/Shanghai" flag="🇨🇳" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: tick ? "#22c55e" : "#065f46", transition: "background 0.5s" }} />
          <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>数据更新 24h/次</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 16px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", marginBottom: 14, background: `${phaseCol}10`, border: `1px solid ${phaseCol}30`, borderRadius: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: phaseCol, boxShadow: `0 0 12px ${phaseCol}80` }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: phaseCol, fontFamily: "'JetBrains Mono',monospace" }}>Phase {d.phase}: {d.phaseName}</span>
            <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 12 }}>Day {d.daysSinceClosure} · JPM缓冲 {d.jpmBuffer}天</span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ width: i === d.phase ? 32 : 16, height: 5, borderRadius: 3, background: i <= d.phase ? phaseCol : "#1f2937", transition: "all 0.4s" }} />)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Section title="关键数据" tag="LIVE">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { l: "通行量", v: `${d.vesselCount} 艘/日`, s: `正常 ${d.vesselNormal}`, alert: true },
                  { l: "Brent", v: `$${d.brent}`, s: d.brentChg, alert: d.brent >= 100 },
                  { l: "Gold", v: `$${d.gold}`, s: d.goldChg },
                  { l: "VLCC日租", v: `$${d.vlcc}K`, s: "历史新高", alert: true },
                  { l: "WTI", v: `$${d.wti}`, s: d.wtiChg },
                  { l: "TTF Gas", v: `€${d.ttf}`, s: "MWh" },
                ].map((m, i) => (
                  <div key={i} style={{ padding: "8px 10px", background: m.alert ? "rgba(239,68,68,0.06)" : "#0b0f19", borderRadius: 6, border: `1px solid ${m.alert ? "rgba(239,68,68,0.2)" : "#1a1f2e"}` }}>
                    <div style={{ fontSize: 9, color: "#6b7280", letterSpacing: "0.06em", marginBottom: 3 }}>{m.l}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: m.alert ? "#f97316" : "#e5e7eb", fontFamily: "'JetBrains Mono',monospace" }}>{m.v}</div>
                    {m.s && <div style={{ fontSize: 10, color: typeof m.s === "string" && m.s.startsWith("+") ? "#22c55e" : "#6b7280", marginTop: 1 }}>{m.s}</div>}
                  </div>
                ))}
              </div>
            </Section>
            <Section title="保险与航运" tag="INSURANCE">
              <div style={{ fontSize: 12, color: "#d1d5db", lineHeight: 1.7 }}>
                <div style={{ marginBottom: 6 }}>🔴 P&I保险：{d.insurance}</div>
                <div style={{ marginBottom: 6 }}>🔴 保费涨幅：300%+</div>
                <div>🟡 绕行：沙特+阿联酋管道合计~420万桶/日（覆盖17%）</div>
              </div>
            </Section>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Section title="关键事项" tag="THINGS TO WATCH">
              {d.thingsToWatch.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: i < d.thingsToWatch.length - 1 ? "1px solid #1a1f2e" : "none" }}>
                  <span style={{ fontSize: 14 }}>{t.icon}</span>
                  <span style={{ fontSize: 12, color: "#d1d5db", lineHeight: 1.6 }}>{t.text}</span>
                </div>
              ))}
            </Section>
            <Section title="情景概率" tag="PREDICTION">
              {d.scenarios.map((s, i) => <ScenarioBar key={i} {...s} />)}
            </Section>
          </div>
        </div>

        <Section title="海峡通行量" tag="VESSELS" style={{ marginBottom: 12 }}>
          <VesselChart data={d.vesselHistory} />
        </Section>

        <Section title="态势总结" tag="SITUATION SUMMARY" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.8, margin: 0 }}>{d.situationSummary}</p>
        </Section>

        <Section title="确认事件" tag="TIMELINE" style={{ marginBottom: 12 }}>
          {d.timeline.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < d.timeline.length - 1 ? "1px solid #1a1f2e" : "none" }}>
              <div style={{ minWidth: 88, fontSize: 10, color: "#6b7280", fontFamily: "monospace", paddingTop: 2 }}>{e.time}</div>
              <div style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, height: "fit-content", marginTop: 2, background: `${tagColor[e.tag]}18`, color: tagColor[e.tag], fontWeight: 700, letterSpacing: "0.04em" }}>{e.tag}</div>
              <div style={{ fontSize: 12, color: "#d1d5db", lineHeight: 1.6 }}>{e.text}</div>
            </div>
          ))}
        </Section>

        <Section title="数据源状态" tag="SOURCE" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {d.sources.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9ca3af", padding: "3px 8px", background: "#0b0f19", borderRadius: 4, border: "1px solid #1a1f2e" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.status === "ok" ? "#22c55e" : "#eab308" }} />{s.name}
              </div>
            ))}
          </div>
        </Section>

        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <button onClick={() => setModal(true)} style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: "#f97316", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🦞 安装 Hormuz Monitor Skill →</button>
          <div style={{ fontSize: 11, color: "#4b5563", marginTop: 8 }}>AI 生成内容，仅供参考</div>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: "#374151", padding: "16px 0 0", borderTop: "1px solid #1a1f2e" }}>
          Built by <a href="https://x.com/xingpt" style={{ color: "#6b7280", textDecoration: "none" }}>@xingpt</a> · OpenClaw + Claude · Not investment advice
        </div>
      </div>

      <SkillModal open={modal} onClose={() => setModal(false)} />
    </div>
  );
}
