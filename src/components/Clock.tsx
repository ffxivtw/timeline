import { useEffect, useState } from 'react';
import './Clock.css';

// 每秒更新的瀏覽器本地時間，作為時間軸「現在」的基準。
export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="clock">
      <div className="clock-time">
        {now.toLocaleTimeString('zh-TW', { hour12: false })}
      </div>
      <div className="clock-date">
        {now.toLocaleDateString('zh-TW', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
        <span className="clock-tz">（{tz}）</span>
      </div>
    </div>
  );
}
