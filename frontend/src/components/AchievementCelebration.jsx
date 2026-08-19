import { useMemo } from 'react';

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0ea5e9', '#eab308'];

const AchievementCelebration = ({ achievements, onClose }) => {
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        tilt: Math.random() * 40 - 20,
      })),
    []
  );

  return (
    <div className="celebration-overlay" onClick={onClose}>
      <div className="confetti-layer">
        {confetti.map((c) => (
          <span
            key={c.id}
            className="confetti-piece"
            style={{
              left: `${c.left}%`,
              background: c.color,
              width: c.size,
              height: c.size,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              transform: `rotate(${c.tilt}deg)`,
            }}
          />
        ))}
      </div>
      <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
        <div className="celebration-badge-pop">🏆</div>
        <h3 className="celebration-title">Achievement Unlocked!</h3>
        {achievements.map((a, i) => (
          <div key={i} className="celebration-item">
            <span className="celebration-emoji">{a.badge}</span>
            <div>
              <strong>{a.title}</strong>
              <p>{a.description}</p>
            </div>
          </div>
        ))}
        <button className="btn-primary" onClick={onClose}>Awesome! 🎉</button>
      </div>
    </div>
  );
};

export default AchievementCelebration;