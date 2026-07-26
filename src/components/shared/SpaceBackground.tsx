
export function SpaceBackground() {
  return (
    // `fixed`, not `absolute`. Absolute meant this layer scrolled with the
    // page, so four 120px-blurred orbs had to be recomposited on every scroll
    // frame -- on every page, since every page renders this. Pinned to the
    // viewport the layer never moves, so scrolling touches it not at all.
    // `contain: paint` additionally stops it participating in the rest of the
    // page's paint work.
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none"
      style={{ contain: "paint" }}
    >
      <div className="glow-orb glow-orb-indigo top-[-5%] left-[-10%]" />
      <div className="glow-orb glow-orb-cyan top-[25%] right-[-5%]" />
      <div className="glow-orb glow-orb-violet top-[55%] left-[-15%]" />
      <div className="glow-orb glow-orb-indigo bottom-[5%] right-[5%]" />
      <div className="mesh-grid" />
      
      {/* Floating background dust/particles */}
      <div className="floating-particle w-1 h-1" style={{ left: "12%", animationDelay: "0s", animationDuration: "14s" }} />
      <div className="floating-particle w-2 h-2" style={{ left: "28%", animationDelay: "2s", animationDuration: "18s" }} />
      <div className="floating-particle w-1.5 h-1.5" style={{ left: "45%", animationDelay: "5s", animationDuration: "12s" }} />
      <div className="floating-particle w-1 h-1" style={{ left: "68%", animationDelay: "1s", animationDuration: "20s" }} />
      <div className="floating-particle w-2.5 h-2.5" style={{ left: "85%", animationDelay: "7s", animationDuration: "16s" }} />
    </div>
  );
}
