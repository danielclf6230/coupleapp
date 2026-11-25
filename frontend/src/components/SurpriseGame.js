import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Tetris from "./surprise/Tetris";
import Puzzle from "./surprise/Puzzle";
import Quiz from "./surprise/Quiz";
import FinalMission from "./surprise/FinalMission";
import PrizeWheel from "./surprise/PrizeWheel";
import { FINAL_MISSION_RULES, MISSION_TITLES } from "./surprise/gameConfig";
import "../styles/SurpriseGame.css";

const endpoint = `${process.env.REACT_APP_API_URL || ""}/api/surprise`;
const RULES = [
  [
    "用左右掣移動方塊，↻ 旋轉，↓ 向下，⤓ 直接落下。電腦亦可以用方向鍵同空白鍵。",
    "限時 180 秒，超越 0916 分就過關！消除 1／2／3／4 行，分別加 100／260／450／700 分；放好方塊唔會加分。",
    "時間到：錫 Daniel 3 啖加 60 秒，保留方塊同分數。堆滿輸咗：錫 5 啖重新挑戰。充值後等 3 秒就可以撳掣開始！",
  ],
  [
    "將兩張相各自拼成完整嘅 9 格回憶。",
    "手指按住下面嘅拼圖，拖到上面正確位置；亦可以先點一塊拼圖，再點目標格仔。",
    "背景有淡淡嘅原圖提示。兩張都完成就過關，冇時間限制，慢慢嚟！",
  ],
  [
    "默契大考驗！你到底有幾了解 Daniel？",
    "一共 4 題，每題有 A、B、C、D 四個答案。答啱先可以去下一題，答錯可以再試。",
  ],
  FINAL_MISSION_RULES,
];

// Keep each page inside the available viewport without scrolling.
function FittedPage({ children, hidden = false, scrollable = false }) {
  const page = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    if (hidden || !page.current) return;
    if (scrollable) {
      setScale(1);
      return;
    }
    const node = page.current;
    const stage = node.parentElement;
    const measure = () => {
      setScale(
        Math.min(
          1,
          Math.max(1, stage.clientHeight - 2) / Math.max(1, node.scrollHeight),
        ),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observer.observe(stage);
    measure();
    return () => {
      observer.disconnect();
    };
  }, [hidden, scrollable]);
  return (
    <div
      ref={page}
      className={`sg-page ${scrollable ? "sg-page-scrollable" : ""}`}
      hidden={hidden}
      style={{ "--sg-page-scale": scale }}
    >
      {children}
    </div>
  );
}

function Celebration({ final, onContinue, busy }) {
  return (
    <div className={`sg-celebration ${final ? "sg-grand" : ""}`}>
      <div className="sg-confetti" aria-hidden="true">
        {Array.from({ length: final ? 48 : 24 }, (_, i) => (
          <i
            key={i}
            style={{
              "--i": i,
              left: `${(i * 37) % 100}%`,
              background: ["#ff9fba", "#ffc44d", "#b2d9ca", "#c9adeb"][i % 4],
              animationDelay: `${(i % 8) * 0.12}s`,
            }}
          />
        ))}
      </div>
      <div className="sg-medal">{final ? "👑" : "🏆"}</div>
      <p className="sg-eyebrow">
        {final ? "ALL MISSIONS COMPLETE" : "MISSION COMPLETE"}
      </p>
      <h2>{final ? "四關全破！你最叻！" : "挑戰成功！叻叻 💗"}</h2>
      <p>
        {final
          ? "專屬你嘅終極大獎，等緊你帶返屋企。"
          : "幸福進度已儲存，下一個驚喜等緊你！"}
      </p>
      <button disabled={busy} onClick={onContinue}>
        {final ? "解鎖幸運大轉盤 ✨" : "前往下一關 →"}
      </button>
    </div>
  );
}

export default function SurpriseGame() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [celebrated, setCelebrated] = useState(0);
  const [activationPrompt, setActivationPrompt] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const dialog = useRef(null);
  const launcher = useRef(null);
  const lock = useRef(false);
  const navigate = useNavigate();
  let localDaniel = false;
  try {
    localDaniel =
      JSON.parse(localStorage.getItem("user"))?.name?.trim().toLowerCase() ===
      "daniel";
  } catch {
    /* authentication handles invalid session */
  }
  const refresh = useCallback(async () => {
    const res = await api.get(endpoint);
    setData(res.data);
    return res.data;
  }, []);
  useEffect(() => {
    const poll = () => refresh().catch(() => {});
    poll();
    const id = setInterval(poll, open ? 3000 : 20000);
    window.addEventListener("focus", poll);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", poll);
    };
  }, [refresh, open]);
  const action = useCallback(
    async (path, body = {}, update = true) => {
      if (lock.current) return null;
      lock.current = true;
      setBusy(true);
      setError("");
      try {
        const res = await api.post(`${endpoint}/${path}`, body);
        if (update) await refresh();
        return res.data;
      } catch (e) {
        setError(
          e.response?.data?.message || "連線未成功，請再試一次。進度會保留。",
        );
        return null;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [refresh],
  );
  const screenFor = (progress) =>
    progress.prize
      ? "result"
      : progress.mission === 0
        ? "intro"
        : progress.mission === 5
          ? "wheel"
          : "rules";
  const launch = async () => {
    setOpen(true);
    setAdminOpen(false);
    setScreen("loading");
    setError("");
    try {
      const latest = await refresh();
      setScreen(screenFor(latest.progress));
    } catch {
      setError("暫時開唔到禮物，請檢查連線再試。");
    }
  };
  const close = () => {
    setOpen(false);
    setAdminOpen(false);
    setActivationPrompt(false);
  };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const giftButton = launcher.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setActivationPrompt(false);
      }
      if (e.key === "Tab") {
        const focusable = [
          ...(dialog.current?.querySelectorAll(
            'button:not(:disabled), [tabindex="0"]',
          ) || []),
        ].filter((node) => node.getClientRects().length > 0);
        if (!focusable.length) {
          e.preventDefault();
          return;
        }
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !dialog.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", key);
      (previous?.isConnected ? previous : giftButton)?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (open) {
      dialog.current?.scrollTo({ top: 0 });
      dialog.current?.focus();
    }
  }, [screen, open, adminOpen]);
  const progress = data?.progress;
  const mission = progress?.mission || 0;
  const win = useCallback(async () => {
    if (await action("advance", { mission })) {
      setCelebrated(mission);
      setScreen("celebrate");
    }
  }, [action, mission]);
  const home = () => {
    close();
    navigate("/album");
  };
  const visible = data?.visible || localDaniel;
  if (!visible) return null;
  const prize = data?.prizes.find((p) => p.id === progress?.prize);
  return (
    <>
      <button
        ref={launcher}
        className="sg-gift-launcher"
        onClick={launch}
        aria-label="開啟甜蜜挑戰禮物"
        title={data?.isDaniel && !data.released ? "Daniel 試玩" : "神秘禮物"}
      >
        <span aria-hidden="true">🎁</span>
      </button>
      {open &&
        createPortal(
          <div className="sg-backdrop">
            <section
              className={`sg-dialog sg-screen-${screen}`}
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="sg-title"
              tabIndex={-1}
            >
              <header className="sg-topbar">
                <span>✦ OUR SECRET GAME ✦</span>
                <div className="sg-topbar-actions">
                  {data?.isDaniel && (
                    <button
                      className="sg-settings"
                      aria-label={adminOpen ? "返回遊戲" : "Daniel 控制台"}
                      onClick={() => setAdminOpen((value) => !value)}
                    >
                      {adminOpen ? "↩" : "⚙"}
                    </button>
                  )}
                  <button
                    className="sg-close"
                    onClick={close}
                    aria-label="關閉遊戲"
                  >
                    ×
                  </button>
                </div>
              </header>
              <div className="sg-content">
                <h1 id="sg-title">甜蜜無敵獎門人</h1>
                <div className="sg-stage">
                  <FittedPage hidden={adminOpen} scrollable={mission === 2 && screen === "play"}>
                    {mission >= 1 && mission <= 4 && screen !== "celebrate" && (
                      <>
                        <div
                          className="sg-steps"
                          aria-label={`第 ${mission} 關，共 4 關`}
                        >
                          {[1, 2, 3, 4].map((n) => (
                            <span
                              key={n}
                              className={n <= mission ? "sg-step-active" : ""}
                            >
                              {n < mission ? "✓" : n}
                            </span>
                          ))}
                        </div>
                        <p className="sg-eyebrow">
                          MISSION 0{mission} · {MISSION_TITLES[mission - 1]}
                        </p>
                      </>
                    )}
                    {error && (
                      <div className="sg-error" role="alert">
                        {error}
                        <button
                          className="sg-secondary"
                          disabled={busy}
                          onClick={launch}
                        >
                          重新載入已存進度
                        </button>
                      </div>
                    )}
                    {screen === "loading" && (
                      <p className="sg-loading">✨ 正在打開你嘅專屬驚喜…</p>
                    )}
                    {screen === "intro" && (
                      <>
                        <div className="sg-intro-art" aria-hidden="true">
                          <span>✦</span>
                          <b>🎁</b>
                          <span>♡</span>
                        </div>
                        <p className="sg-eyebrow">
                          A LITTLE ADVENTURE, JUST FOR YOU
                        </p>
                        <h2>獎金禮品非常豐富！</h2>
                        <p>四重甜蜜挑戰，解鎖你嘅專屬大獎 💗</p>
                        <div className="sg-prizes">
                          {data.prizes.map((p, i) => (
                            <div className="sg-prize-card" key={p.id}>
                              <span>
                                {["💴", "💰", "🛍️", "⏰", "🏬", "🍮"][i]}
                              </span>
                              <strong>{p.label}</strong>
                              <small>
                                {i < 2 ? "稀有現金大獎" : "甜蜜任買禮遇"}
                              </small>
                            </div>
                          ))}
                        </div>
                        <div className="sg-card">
                          <h3>挑戰守則 📜</h3>
                          <p>完成四關先可抽獎，每個帳戶可贏一份獎品。</p>
                          <p>
                            離開會保存過關進度；重入重玩當前關卡。獎品會保留。
                          </p>
                        </div>
                        <button
                          disabled={busy}
                          onClick={async () => {
                            if (await action("advance", { mission: 0 }))
                              setScreen("rules");
                          }}
                        >
                          進入挑戰 →
                        </button>
                      </>
                    )}
                    {screen === "rules" && mission >= 1 && mission <= 4 && (
                      <div className="sg-rules">
                        <div className="sg-large-icon">
                          {["🧩", "📸", "💭", "⏳"][mission - 1]}
                        </div>
                        <h2>{MISSION_TITLES[mission - 1]}</h2>
                        <div className="sg-card">
                          {RULES[mission - 1].map((rule, i) => (
                            <p key={i}>{rule}</p>
                          ))}
                        </div>
                        <button
                          disabled={busy}
                          onClick={() => setScreen("play")}
                        >
                          準備好！開始挑戰 ▶
                        </button>
                      </div>
                    )}
                    {screen === "play" && mission === 1 && (
                      <Tetris
                        onWin={win}
                        progress={progress}
                        busy={busy}
                        requestRecharge={(kind) => action("recharge", { kind })}
                        consumeRecharge={() => action("consume")}
                      />
                    )}
                    {screen === "play" && mission === 2 && (
                      <Puzzle onWin={win} busy={busy} />
                    )}
                    {screen === "play" && mission === 3 && (
                      <Quiz onWin={win} busy={busy} />
                    )}
                    {screen === "play" && mission === 4 && (
                      <FinalMission onWin={win} busy={busy} />
                    )}
                    {data?.isDaniel &&
                      mission >= 1 && mission <= 4 &&
                      (screen === "rules" || screen === "play") && (
                        <button
                          className="sg-secondary sg-test-skip"
                          disabled={busy}
                          onClick={async () => {
                            if (await action("skip-test", { mission }))
                              setScreen(mission === 4 ? "wheel" : "rules");
                          }}
                        >
                          Daniel 試玩：跳過第 {mission} 關 →
                        </button>
                      )}
                    {screen === "celebrate" && (
                      <Celebration
                        final={celebrated === 4}
                        busy={busy}
                        onContinue={() =>
                          setScreen(mission === 5 ? "wheel" : "rules")
                        }
                      />
                    )}
                    {screen === "wheel" && (
                      <PrizeWheel
                        prizes={data.prizes}
                        spin={() => action("spin", {}, false)}
                        onResult={async () => {
                          try {
                            await refresh();
                            setScreen("result");
                          } catch {
                            setError("獎品已抽出並儲存，請重新開啟禮物查看。");
                          }
                        }}
                        busy={busy}
                      />
                    )}
                    {screen === "result" && (
                      <div className="sg-result">
                        <div className="sg-medal">🎁</div>
                        <p className="sg-eyebrow">YOUR HAPPILY EVER AFTER</p>
                        <h2>恭喜哂，你得到…</h2>
                        <div className="sg-winner-prize">
                          {prize?.label || "正在讀取你嘅大獎…"}
                        </div>
                        <p>
                          四關挑戰，滿滿心意。
                          <br />
                          呢份幸福係屬於你㗎，搵 Daniel 兌換啦 💗
                        </p>
                        <button onClick={home}>帶住幸福返首頁 ♡</button>
                      </div>
                    )}
                  </FittedPage>
                  {data?.isDaniel && (
                    <FittedPage hidden={!adminOpen}>
                      <div className="sg-admin">
                        <h2>Daniel 專用控制台</h2>
                        <p>
                          {data.released
                            ? "禮物已向兩個帳戶開放。"
                            : "目前只有你見到測試入口。2027/1/29 日本時間 00:00 自動向兩個帳戶開放。"}
                        </p>
                        {!data.released && (
                          <>
                            {!activationPrompt ? (
                              <button
                                className="sg-secondary"
                                onClick={() => setActivationPrompt(true)}
                              >
                                手動開放畀兩個 user
                              </button>
                            ) : (
                              <div className="sg-card">
                                <p>即時開放後，女朋友亦會見到禮物。</p>
                                <button
                                  disabled={busy}
                                  onClick={async () => {
                                    if (await action("activate"))
                                      setActivationPrompt(false);
                                  }}
                                >
                                  確認即時開放
                                </button>
                                <button
                                  className="sg-secondary"
                                  onClick={() => setActivationPrompt(false)}
                                >
                                  取消
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        <button
                          className="sg-secondary"
                          disabled={busy}
                          onClick={async () => {
                            if (await action("reset-test")) {
                              setScreen("intro");
                              setAdminOpen(false);
                            }
                          }}
                        >
                          重設我自己嘅測試進度
                        </button>
                        <small>只影響 Daniel 帳戶；唔會改動另一個 user。</small>
                      </div>
                    </FittedPage>
                  )}
                </div>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
