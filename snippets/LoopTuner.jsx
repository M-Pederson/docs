export const LoopTuner = () => {
  const people = [
    {
      id: "maya",
      name: "Maya Okonkwo",
      blurb: "VP Catalog Strategy, indie label group",
      diag: { identity: 0.7, domain: 0.82, soft: 0.55, track: 0.76, public: 0.74, comm: 0.6, passion: 0.68 },
      cross: { dom_pub: 0.68, dom_pas: 0.62, pub_dom: 0.7, pub_pas: 0.58, pas_dom: 0.64, pas_pub: 0.6 },
      dist: 3,
      jac: 0.15,
      brk: 0.5,
    },
    {
      id: "dev",
      name: "Dev Ramaswamy",
      blurb: "Backend eng, fintech; generative-music side project",
      diag: { identity: 0.4, domain: 0.34, soft: 0.58, track: 0.45, public: 0.3, comm: 0.5, passion: 0.79 },
      cross: { dom_pub: 0.4, dom_pas: 0.83, pub_dom: 0.36, pub_pas: 0.74, pas_dom: 0.41, pas_pub: 0.39 },
      dist: 3,
      jac: 0.1,
      brk: 0.35,
    },
    {
      id: "joon",
      name: "Joon-ho Lee",
      blurb: "Seed investor, media and entertainment tech",
      diag: { identity: 0.3, domain: 0.66, soft: 0.62, track: 0.55, public: 0.58, comm: 0.65, passion: 0.5 },
      cross: { dom_pub: 0.55, dom_pas: 0.58, pub_dom: 0.62, pub_pas: 0.5, pas_dom: 0.6, pas_pub: 0.52 },
      dist: 4,
      jac: 0.08,
      brk: 0.6,
    },
    {
      id: "priya",
      name: "Priya Anand",
      blurb: "Head of Sync Licensing (direct contact)",
      diag: { identity: 0.62, domain: 0.8, soft: 0.58, track: 0.7, public: 0.7, comm: 0.64, passion: 0.65 },
      cross: { dom_pub: 0.66, dom_pas: 0.6, pub_dom: 0.68, pub_pas: 0.58, pas_dom: 0.62, pas_pub: 0.6 },
      dist: 1,
      jac: 0.4,
      brk: 0.55,
    },
    {
      id: "marcus",
      name: "Marcus Bell",
      blurb: "Community organizer; super-connector",
      diag: { identity: 0.45, domain: 0.4, soft: 0.55, track: 0.4, public: 0.42, comm: 0.6, passion: 0.38 },
      cross: { dom_pub: 0.4, dom_pas: 0.42, pub_dom: 0.44, pub_pas: 0.4, pas_dom: 0.42, pas_pub: 0.4 },
      dist: 2,
      jac: 0.55,
      brk: 0.9,
    },
    {
      id: "lena",
      name: "Lena Fischer",
      blurb: "Documentary producer, festival circuit",
      diag: { identity: 0.55, domain: 0.5, soft: 0.5, track: 0.5, public: 0.52, comm: 0.58, passion: 0.55 },
      cross: { dom_pub: 0.5, dom_pas: 0.52, pub_dom: 0.5, pub_pas: 0.5, pas_dom: 0.5, pas_pub: 0.52 },
      dist: 3,
      jac: 0.2,
      brk: 0.4,
    },
    {
      id: "tariq",
      name: "Tariq Hassan",
      blurb: "Music data scientist, ML for A&R",
      diag: { identity: 0.58, domain: 0.72, soft: 0.6, track: 0.65, public: 0.6, comm: 0.55, passion: 0.58 },
      cross: { dom_pub: 0.6, dom_pas: 0.58, pub_dom: 0.62, pub_pas: 0.55, pas_dom: 0.6, pas_pub: 0.55 },
      dist: 3,
      jac: 0.12,
      brk: 0.45,
    },
    {
      id: "sofia",
      name: "Sofia Greco",
      blurb: "Podcast host, culture and tech",
      diag: { identity: 0.5, domain: 0.55, soft: 0.52, track: 0.48, public: 0.76, comm: 0.72, passion: 0.6 },
      cross: { dom_pub: 0.7, dom_pas: 0.55, pub_dom: 0.58, pub_pas: 0.56, pas_dom: 0.5, pas_pub: 0.68 },
      dist: 4,
      jac: 0.1,
      brk: 0.5,
    },
    {
      id: "owen",
      name: "Owen Nakamura",
      blurb: "Hardware founder, robotics",
      diag: { identity: 0.65, domain: 0.28, soft: 0.6, track: 0.68, public: 0.32, comm: 0.5, passion: 0.42 },
      cross: { dom_pub: 0.32, dom_pas: 0.45, pub_dom: 0.3, pub_pas: 0.42, pas_dom: 0.34, pas_pub: 0.36 },
      dist: 4,
      jac: 0.07,
      brk: 0.4,
    },
  ];

  const dims = ["identity", "domain", "soft", "track", "public", "comm", "passion"];
  const labels = {
    identity: "identity_profile",
    domain: "domain_focus",
    soft: "soft_skills",
    track: "track_record",
    public: "public_engagement",
    comm: "communication_style",
    passion: "passions_interests",
  };
  const roles = { domain: "drv", public: "drv", passion: "drv", identity: "val", track: "val", soft: "mod", comm: "mod" };
  const short = { domain: "domain", public: "public", passion: "passion" };
  const cross = [
    ["dom_pub", "domain", "public"],
    ["dom_pas", "domain", "passion"],
    ["pub_dom", "public", "domain"],
    ["pub_pas", "public", "passion"],
    ["pas_dom", "passion", "domain"],
    ["pas_pub", "passion", "public"],
  ];

  const [settings, setSettings] = useState({
    mode: "peer",
    temp: 2,
    wDrivers: 0.55,
    wValence: 0.2,
    wBridge: 0.15,
    nodeInfluence: 0.3,
    liftTau: 0.5,
  });
  const [selectedId, setSelectedId] = useState(null);

  const css = `
  .loop-tuner {
    --paper: #fff;
    --bg: #f7f7f9;
    --ink: #17171d;
    --muted: #6b6b76;
    --faint: #9a9aa6;
    --line: #e8e8ef;
    --line-2: #d9d9e4;
    --soft: #f1f1f5;
    --diag: #2563eb;
    --diag-bg: rgba(37, 99, 235, .08);
    --ser: #7c3aed;
    --ser-bg: rgba(124, 58, 237, .08);
    --over: #111827;
    --over-bg: rgba(17, 24, 39, .06);
    --pos: #0f8f68;
    --neg: #c24154;
    margin: 24px 0;
    padding: 18px;
    color: var(--ink);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.45;
  }
  .loop-tuner * { box-sizing: border-box; }
  .loop-tuner button, .loop-tuner input { font: inherit; }
  .lt-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; }
  .lt-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .lt-orb { position: relative; width: 26px; height: 26px; flex: 0 0 auto; }
  .lt-orb::before { content: ""; position: absolute; inset: 0; border: 1.5px solid rgba(37, 99, 235, .25); border-radius: 50%; transform: rotate(-22deg); }
  .lt-orb::after { content: ""; position: absolute; inset: 8px; background: var(--diag); border-radius: 50%; box-shadow: 6px -8px 0 -2px var(--ser), 0 0 0 8px rgba(124, 58, 237, .08); }
  .lt-title { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 0; }
  .lt-title span { color: var(--faint); font-weight: 500; }
  .lt-sub { max-width: 64ch; margin-top: 2px; color: var(--muted); font-size: 12px; }
  .lt-mode { display: flex; gap: 2px; padding: 3px; background: var(--paper); border: 1px solid var(--line-2); border-radius: 9px; }
  .lt-mode button { border: 0; border-radius: 7px; background: transparent; color: var(--muted); cursor: pointer; font-size: 12px; font-weight: 600; line-height: 1.15; padding: 7px 12px; }
  .lt-mode span { display: block; margin-top: 1px; color: var(--faint); font-size: 10px; font-weight: 500; }
  .lt-mode .active { background: var(--ink); color: #fff; }
  .lt-mode .active span { color: rgba(255, 255, 255, .66); }
  .lt-panel { margin-bottom: 16px; padding: 14px 16px 10px; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }
  .lt-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px 22px; }
  .lt-control label { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 6px; color: var(--muted); font-size: 11px; }
  .lt-control strong { color: var(--ink); font-weight: 600; }
  .lt-control code { color: var(--diag); background: transparent; font-size: 11px; font-weight: 600; padding: 0; }
  .lt-control.ser code { color: var(--ser); }
  .lt-control input { width: 100%; height: 4px; margin: 4px 0 3px; accent-color: var(--diag); }
  .lt-control.ser input { accent-color: var(--ser); }
  .lt-hint { min-height: 28px; color: var(--faint); font-size: 10.5px; }
  .lt-lanes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .lt-lane { min-height: 120px; padding: 13px 12px; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }
  .lt-lane.diag { box-shadow: inset 3px 0 0 var(--diag); }
  .lt-lane.ser { box-shadow: inset 3px 0 0 var(--ser); }
  .lt-lane.over { box-shadow: inset 3px 0 0 var(--over); }
  .lt-lane-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 0 2px 10px; }
  .lt-lane-title { font-size: 12px; font-weight: 700; }
  .lt-lane.diag .lt-lane-title { color: var(--diag); }
  .lt-lane.ser .lt-lane-title { color: var(--ser); }
  .lt-lane-note { max-width: 24ch; color: var(--faint); font-size: 10.5px; line-height: 1.3; text-align: right; }
  .lt-list { display: flex; flex-direction: column; gap: 7px; }
  .lt-card { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; background: var(--paper); border: 1px solid var(--line); border-radius: 9px; color: inherit; cursor: pointer; text-align: left; transition: background .15s, border-color .15s, box-shadow .15s, transform .15s; }
  .lt-card:hover { background: #fcfcfe; border-color: var(--line-2); transform: translateY(-1px); }
  .lt-card.selected { border-color: var(--diag); box-shadow: 0 0 0 2px var(--diag-bg); }
  .lt-rank { width: 18px; flex: 0 0 auto; color: var(--faint); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 600; text-align: right; }
  .lt-who { min-width: 0; flex: 1 1 auto; }
  .lt-name { display: block; overflow: hidden; color: var(--ink); font-size: 12.5px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
  .lt-blurb { display: block; overflow: hidden; margin-top: 1px; color: var(--muted); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
  .lt-badge, .lt-tag { display: inline-flex; align-items: center; margin-top: 5px; padding: 2px 6px; border-radius: 5px; font-size: 9.5px; font-weight: 700; }
  .lt-badge { background: var(--ser-bg); color: var(--ser); }
  .lt-tag.diag { background: var(--diag-bg); color: var(--diag); }
  .lt-tag.ser { background: var(--ser-bg); color: var(--ser); }
  .lt-score { flex: 0 0 auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; font-weight: 800; text-align: right; }
  .lt-lane.diag .lt-score { color: var(--diag); }
  .lt-lane.ser .lt-score { color: var(--ser); }
  .lt-lane.over .lt-score { color: var(--over); }
  .lt-lift { display: block; margin-top: 1px; color: var(--pos); font-size: 9.5px; font-weight: 700; }
  .lt-empty { padding: 10px 4px; color: var(--faint); font-size: 11px; font-style: italic; text-align: center; }
  .lt-suppressed, .lt-detail { margin-top: 14px; padding: 13px; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }
  .lt-suppressed { background: #f3f3f6; border-style: dashed; }
  .lt-supp-title, .lt-section-title { margin-bottom: 8px; color: var(--faint); font-size: 10px; font-weight: 800; text-transform: uppercase; }
  .lt-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .lt-chip { display: flex; gap: 7px; align-items: center; padding: 5px 9px; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; }
  .lt-chip strong { color: #8b8b97; font-size: 11.5px; }
  .lt-chip span { color: var(--faint); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; }
  .lt-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .lt-detail h3 { margin: 0; font-size: 15px; letter-spacing: 0; }
  .lt-detail-sub { margin-top: 2px; color: var(--muted); font-size: 11.5px; }
  .lt-close { border: 0; border-radius: 7px; background: var(--soft); color: var(--muted); cursor: pointer; font-weight: 800; line-height: 1; padding: 8px 10px; }
  .lt-detail-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: 14px; }
  .lt-section { margin-top: 12px; }
  .lt-section:first-child { margin-top: 0; }
  .lt-kv { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 2px 0; font-size: 11.5px; }
  .lt-kv span:first-child { color: var(--muted); }
  .lt-kv span:last-child { color: var(--ink); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; text-align: right; }
  .lt-zrow { display: grid; grid-template-columns: minmax(86px, 128px) 1fr 44px; align-items: center; gap: 8px; padding: 3px 0; font-size: 11px; }
  .lt-zname { overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
  .lt-role { display: inline-block; margin-left: 5px; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 800; vertical-align: middle; }
  .lt-role.drv { background: var(--diag-bg); color: var(--diag); }
  .lt-role.val { background: var(--over-bg); color: var(--over); }
  .lt-role.mod { background: var(--soft); color: var(--muted); }
  .lt-role.grf { background: var(--ser-bg); color: var(--ser); }
  .lt-bar { position: relative; height: 6px; overflow: hidden; background: var(--soft); border-radius: 3px; }
  .lt-bar::before { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: var(--line-2); }
  .lt-fill { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
  .lt-zvalue { color: var(--ink); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-align: right; }
  .lt-explain { margin-top: 8px; color: var(--muted); font-size: 10.5px; line-height: 1.5; }
  @media (max-width: 900px) {
    .lt-head { flex-direction: column; }
    .lt-lanes, .lt-detail-grid { grid-template-columns: 1fr; }
    .lt-lane-note { max-width: none; }
  }
  `;

  const fmt = (value, digits = 2) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
  const fixed = (value, digits = 2) => value.toFixed(digits);
  const zscore = (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / values.length;
    const sd = Math.sqrt(variance);
    return sd === 0 ? values.map(() => 0) : values.map((value) => (value - mean) / sd);
  };
  const softMax = (temp, values) => {
    if (temp <= 0.000001) return values.reduce((sum, value) => sum + value, 0) / values.length;
    let numerator = 0;
    let denominator = 0;
    values.forEach((value) => {
      const weight = Math.exp(temp * value);
      numerator += weight * value;
      denominator += weight;
    });
    return denominator === 0 ? 0 : numerator / denominator;
  };
  const prox = (dist) => (dist === 2 ? 1 : dist === 3 ? 0.6 : dist === 4 ? 0.25 : 0);
  const minmaxMap = (items, getValue) => {
    const values = items.map(getValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    return Object.fromEntries(items.map((item) => [item.id, span === 0 ? 0.5 : (getValue(item) - min) / span]));
  };

  const model = useMemo(() => {
    const zById = {};
    dims.forEach((dim) => {
      const values = zscore(people.map((person) => person.diag[dim]));
      people.forEach((person, index) => {
        zById[person.id] = zById[person.id] || {};
        zById[person.id][dim] = values[index];
      });
    });

    const zBridge = zscore(people.map((person) => prox(person.dist) * (1 - person.jac)));
    const zNode = zscore(people.map((person) => person.brk));
    const zCrossById = {};
    cross.forEach(([key]) => {
      const values = zscore(people.map((person) => person.cross[key]));
      people.forEach((person, index) => {
        zCrossById[person.id] = zCrossById[person.id] || {};
        zCrossById[person.id][key] = values[index];
      });
    });

    const rows = people.map((person, index) => {
      const z = zById[person.id];
      const drivers = softMax(settings.temp, [z.domain, z.public, z.passion]);
      const peerMode = settings.mode === "peer";
      const valence = peerMode ? z.identity + z.track : z.domain - z.identity;
      const softSign = peerMode ? 1 : -1;
      const modifiers = 0.03 * softSign * z.soft + 0.02 * z.comm;
      const bridgeTerm = zBridge[index] + settings.nodeInfluence * zNode[index];
      const diag = settings.wDrivers * drivers + settings.wValence * valence + settings.wBridge * bridgeTerm + modifiers;
      let ser = { z: Number.NEGATIVE_INFINITY, key: null, tgt: null, cand: null };
      cross.forEach(([key, tgt, cand]) => {
        const value = zCrossById[person.id][key];
        if (value > ser.z) ser = { z: value, key, tgt, cand };
      });
      return {
        ...person,
        z,
        dropped: person.dist <= 1,
        drivers,
        valence,
        softSign,
        modifiers,
        bridgeTerm,
        zBridge: zBridge[index],
        zNode: zNode[index],
        diag,
        ser,
        lift: ser.z - drivers,
      };
    });

    const live = rows.filter((row) => !row.dropped);
    const diagRank = [...live].sort((a, b) => b.diag - a.diag);
    const serRank = [...live].filter((row) => row.lift > settings.liftTau).sort((a, b) => b.lift - a.lift);
    const diagonalScores = minmaxMap(live, (row) => row.diag);
    const serendipityScores = minmaxMap(live, (row) => row.ser.z);
    const overall = live
      .map((row) => {
        const diagonal = diagonalScores[row.id];
        const serendipity = serendipityScores[row.id];
        return { ...row, overallScore: Math.max(diagonal, serendipity), overallLane: diagonal >= serendipity ? "diagonal" : "serendipity" };
      })
      .sort((a, b) => b.overallScore - a.overallScore);

    return {
      byId: Object.fromEntries(rows.map((row) => [row.id, row])),
      diagRank,
      serRank,
      overall,
      dropped: rows.filter((row) => row.dropped),
    };
  }, [settings.mode, settings.temp, settings.wDrivers, settings.wValence, settings.wBridge, settings.nodeInfluence, settings.liftTau]);

  const selected = selectedId ? model.byId[selectedId] : null;
  const setNumber = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const choose = (id) => setSelectedId((current) => (current === id ? null : id));

  const controls = [
    { key: "temp", label: "Soft-max temperature", min: 0, max: 6, step: 0.1, digits: 1, hint: "0 = mean of drivers; high = one strong thread wins" },
    { key: "wDrivers", label: "Drivers weight", min: 0, max: 0.8, step: 0.01, digits: 2, hint: "domain, public, passion: the reason to introduce" },
    { key: "wValence", label: "Valence weight", min: 0, max: 0.5, step: 0.01, digits: 2, hint: "identity and track; sign flips by mode" },
    { key: "wBridge", label: "Bridge weight", min: 0, max: 0.5, step: 0.01, digits: 2, hint: "structural hole in the graph, not content" },
    { key: "nodeInfluence", label: "Node-broker nudge", min: 0, max: 1.2, step: 0.05, digits: 2, hint: "connector prior; keep small or it dominates" },
    { key: "liftTau", label: "Serendipity lift floor", min: -0.5, max: 2.5, step: 0.05, digits: 2, hint: "how far cross must beat diagonal to qualify", ser: true },
  ];

  const zbar = (dim, row) => {
    const value = row.z[dim];
    const role = roles[dim];
    const clamped = Math.max(-3, Math.min(3, value));
    const pct = (Math.abs(clamped) / 3) * 50;
    const left = clamped >= 0 ? 50 : 50 - pct;
    const color = role === "drv" ? "var(--diag)" : role === "val" ? "var(--over)" : "var(--faint)";
    return (
      <div key={dim} className="lt-zrow">
        <div className="lt-zname">
          {labels[dim]}
          <span className={`lt-role ${role}`}>{role}</span>
        </div>
        <div className="lt-bar">
          <span className="lt-fill" style={{ left: `${left}%`, width: `${pct}%`, background: color }} />
        </div>
        <div className="lt-zvalue">{fmt(value)}</div>
      </div>
    );
  };

  const card = (row, lane, index) => {
    const selectedClass = selectedId === row.id ? " selected" : "";
    const marker =
      lane === "ser" ? (
        <span className="lt-badge">
          {short[row.ser.cand]} -&gt; your {short[row.ser.tgt]}
        </span>
      ) : lane === "over" ? (
        <span className={`lt-tag ${row.overallLane === "diagonal" ? "diag" : "ser"}`}>{row.overallLane}</span>
      ) : null;
    const score =
      lane === "diag" ? (
        <div className="lt-score">{fmt(row.diag)}</div>
      ) : lane === "ser" ? (
        <div className="lt-score">
          {fmt(row.ser.z)}
          <span className="lt-lift">lift {fmt(row.lift)}</span>
        </div>
      ) : (
        <div className="lt-score">{fixed(row.overallScore)}</div>
      );

    return (
      <button key={`${lane}-${row.id}`} type="button" className={`lt-card${selectedClass}`} onClick={() => choose(row.id)} aria-pressed={selectedId === row.id}>
        <span className="lt-rank">{index + 1}</span>
        <span className="lt-who">
          <span className="lt-name">{row.name}</span>
          <span className="lt-blurb">{row.blurb}</span>
          {marker}
        </span>
        {score}
      </button>
    );
  };

  const lane = (type, title, note, rows, cardType, empty) => (
    <section className={`lt-lane ${type}`} key={type}>
      <div className="lt-lane-head">
        <span className="lt-lane-title">{title}</span>
        <span className="lt-lane-note">{note}</span>
      </div>
      <div className="lt-list">{rows.length ? rows.map((row, index) => card(row, cardType, index)) : <div className="lt-empty">{empty}</div>}</div>
    </section>
  );

  return (
    <div className="loop-tuner not-prose">
      <style>{css}</style>
      <header className="lt-head">
        <div className="lt-brand">
          <div className="lt-orb" aria-hidden="true" />
          <div>
            <h3 className="lt-title">
              Leverage Loop <span>suggestion tuner</span>
            </h3>
            <div className="lt-sub">One target persona scored against its network. Tune aggregation and watch who surfaces in each lane.</div>
          </div>
        </div>
        <div className="lt-mode" aria-label="Scoring mode">
          <button type="button" className={settings.mode === "peer" ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, mode: "peer" }))}>
            Peer<span>like to like</span>
          </button>
          <button type="button" className={settings.mode === "complement" ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, mode: "complement" }))}>
            Complement<span>missing piece</span>
          </button>
        </div>
      </header>

      <section className="lt-panel" aria-label="Scoring controls">
        <div className="lt-controls">
          {controls.map((control) => (
            <div key={control.key} className={`lt-control${control.ser ? " ser" : ""}`}>
              <label>
                <strong>{control.label}</strong>
                <code>{settings[control.key].toFixed(control.digits)}</code>
              </label>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={settings[control.key]}
                onChange={(event) => setNumber(control.key, Number.parseFloat(event.target.value))}
              />
              <div className="lt-hint">{control.hint}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="lt-lanes">
        {lane("diag", "Diagonal", "channel-aligned match", model.diagRank, "diag", "No candidates")}
        {lane("ser", "Serendipity", "cross-channel hit", model.serRank, "ser", "Nothing clears the lift floor. Lower the floor to see more.")}
        {lane("over", "Overall", "best lane per candidate", model.overall, "over", "No candidates")}
      </div>

      <section className="lt-suppressed">
        <div className="lt-supp-title">Suppressed: already connected</div>
        <div className="lt-chips">
          {model.dropped.map((row) => (
            <div key={row.id} className="lt-chip">
              <strong>{row.name}</strong>
              <span>{row.dist} hop; gated</span>
            </div>
          ))}
        </div>
      </section>

      {selected ? (
        <section className="lt-detail">
          <div className="lt-detail-head">
            <div>
              <h3>{selected.name}</h3>
              <div className="lt-detail-sub">{selected.blurb}</div>
            </div>
            <button type="button" className="lt-close" onClick={() => setSelectedId(null)} aria-label="Close candidate details">
              Close
            </button>
          </div>

          <div className="lt-detail-grid">
            <div>
              <div className="lt-section">
                <div className="lt-section-title">Diagonal composite: {fmt(selected.diag)}</div>
                <div className="lt-kv">
                  <span>drivers soft-max @ {fixed(settings.temp, 1)}</span>
                  <span>{fmt(selected.drivers)} =&gt; {fmt(settings.wDrivers * selected.drivers)}</span>
                </div>
                <div className="lt-kv">
                  <span>valence ({settings.mode})</span>
                  <span>{fmt(selected.valence)} =&gt; {fmt(settings.wValence * selected.valence)}</span>
                </div>
                <div className="lt-kv">
                  <span>bridge plus node {fixed(settings.nodeInfluence)}</span>
                  <span>{fmt(selected.bridgeTerm)} =&gt; {fmt(settings.wBridge * selected.bridgeTerm)}</span>
                </div>
                <div className="lt-kv">
                  <span>modifiers, soft sign {selected.softSign > 0 ? "+" : "-"}</span>
                  <span>{fmt(selected.modifiers)}</span>
                </div>
              </div>

              <div className="lt-section">
                <div className="lt-section-title">Graph signal</div>
                <div className="lt-kv">
                  <span>shortest path</span>
                  <span>{selected.dist} hops</span>
                </div>
                <div className="lt-kv">
                  <span>neighborhood overlap</span>
                  <span>{fixed(selected.jac)}</span>
                </div>
                <div className="lt-kv">
                  <span>pair bridge =&gt; z</span>
                  <span>{fixed(prox(selected.dist) * (1 - selected.jac))} =&gt; {fmt(selected.zBridge)}</span>
                </div>
                <div className="lt-kv">
                  <span>node broker prior =&gt; z</span>
                  <span>{fixed(selected.brk)} =&gt; {fmt(selected.zNode)}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="lt-section">
                <div className="lt-section-title">Drivers</div>
                {["domain", "public", "passion"].map((dim) => zbar(dim, selected))}
              </div>
              <div className="lt-section">
                <div className="lt-section-title">Valence</div>
                {["identity", "track"].map((dim) => zbar(dim, selected))}
              </div>
              <div className="lt-section">
                <div className="lt-section-title">Modifiers</div>
                {["soft", "comm"].map((dim) => zbar(dim, selected))}
              </div>
            </div>
          </div>

          <div className="lt-section">
            <div className="lt-section-title">
              Serendipity <span className="lt-role grf">off-diagonal</span>
            </div>
            <div className="lt-kv">
              <span>best cross cell</span>
              <span>{short[selected.ser.cand]} =&gt; {short[selected.ser.tgt]}</span>
            </div>
            <div className="lt-kv">
              <span>cross z argmax</span>
              <span>{fmt(selected.ser.z)}</span>
            </div>
            <div className="lt-kv">
              <span>minus diagonal driver pool</span>
              <span>{fmt(selected.drivers)}</span>
            </div>
            <div className="lt-kv">
              <span>lift</span>
              <span style={{ color: selected.lift > settings.liftTau ? "var(--pos)" : "var(--neg)" }}>
                {fmt(selected.lift)} {selected.lift > settings.liftTau ? "qualifies" : "below floor"}
              </span>
            </div>
            <div className="lt-explain">
              Their <strong>{short[selected.ser.cand]}</strong> narrative lights up against your <strong>{short[selected.ser.tgt]}</strong> narrative.
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};
