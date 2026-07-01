import { Clock } from './components/Clock';
import { PredictionCard } from './components/PredictionCard';
import { Timeline } from './components/Timeline';
import { ComparisonTable } from './components/ComparisonTable';
import { servers, versions } from './data/versions';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>FFXIV 跨伺服器改版時間軸</h1>
        <Clock />
      </header>

      <section className="section">
        <h2>繁中服後續版本預估</h2>
        <PredictionCard versions={versions} servers={servers} />
      </section>

      <section className="section">
        <h2>版本時間軸</h2>
        <Timeline versions={versions} servers={servers} />
      </section>

      <section className="section">
        <h2>版本對照表</h2>
        <ComparisonTable versions={versions} servers={servers} />
      </section>

      <footer className="app-footer">
        © SQUARE ENIX CO., LTD. All Rights Reserved.
      </footer>
    </div>
  );
}
