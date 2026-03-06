import { Link } from "react-router-dom"

export default function NotFound() {
  return (
    <div className="antialiased min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#09090b] text-[#fafafa] font-sans">
      <style>{`
        .glass-card {
            background: rgba(9, 9, 11, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hero-glow {
            background: radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
        }
      `}</style>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] hero-glow pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="glass-card p-12 rounded-2xl max-w-lg text-center shadow-2xl relative z-10">
        <div className="text-8xl font-bold mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/10">
          404
        </div>
        
        <h2 className="text-2xl font-semibold mb-4 tracking-tight">Page Not Found</h2>
        <p className="text-[#a1a1aa] mb-8 leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        
        <Link 
          to="/" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-[#fafafa] text-[#18181b] hover:bg-[#fafafa]/90 h-10 px-8 py-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] gap-2 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
          Return Home
        </Link>
      </div>
    </div>
  )
}