import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form";
import { useAuth } from "@/utils/hooks/useAuth";
import { loginAction } from "@/utils/actions/auth.actions.js";
import { useGoogleOAuth } from "@/utils/hooks/useGoogleOAuth";

export default function LoginPage() {
  const [loginError, setLoginError] = useState(null);
  const [loading, setLoading] = useState(false);
  const googleOAuthUrl = useGoogleOAuth();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const location = useLocation();
  const navigate = useNavigate();

  const { setAuth } = useAuth();
 
  const from = location.state?.from?.pathname || "/workspace";

  const usernameField = register("username", {
    required: "Username is required"
  });

  const passwordField = register("password", {
    required: "Password is required"
  })

  const onSubmit = async (data) => {
    setLoading(true);
    setLoginError(null);
    
    const cleanData = { ...data, username: data.username.trim() };

    try{
      const result = await loginAction(cleanData);
      if(result.error) setLoginError(result.error);
      else{
        setAuth(result);
        setLoginError(null);
        navigate(from, { replace: true });
      }
    }finally{
      setLoading(false); 
    }
  }

  return (
    <div className="antialiased min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090b] text-[#fafafa] font-sans">
      <style>{`
        .glass-card {
            background: rgba(9, 9, 11, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hero-glow {
            background: radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
        }
      `}</style>

      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] hero-glow pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-lg px-4 sm:px-6 relative z-10">


          {/* Login Card */}
          <div className="glass-card rounded-xl p-5 sm:p-8 shadow-2xl">
              <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                  <p className="text-sm text-[#a1a1aa] mt-2">Enter your username to sign in</p>
              </div>

              {loginError && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-in fade-in slide-in-from-top-2 duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  <span>{loginError}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                  <div className="space-y-2">
                      <label htmlFor="username" className="text-sm font-medium leading-none block">Username</label>
                      <input 
                        type="text" 
                        id="username" 
                        {...usernameField}
                        className="flex h-10 w-full rounded-md border border-[#27272a] bg-white/5 px-3 py-2 text-sm placeholder:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white/10 ring-offset-[#09090b]" 
                        placeholder="johndoe" 
                      />
                      {errors.username && <span className="text-xs text-red-500 block">{errors.username.message}</span>}
                  </div>
                  
                  <div className="space-y-2">
                      <div className="flex items-center justify-between">
                          <label htmlFor="password" className="text-sm font-medium leading-none block">Password</label>
                          <a href="#" className="text-xs text-[#a1a1aa] hover:text-[#fafafa] transition-colors">Forgot password?</a>
                      </div>
                      <input 
                        type="password" 
                        id="password" 
                        {...passwordField}
                        className="flex h-10 w-full rounded-md border border-[#27272a] bg-white/5 px-3 py-2 text-sm placeholder:text-[#a1a1aa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white/10 ring-offset-[#09090b]" 
                      />
                      {errors.password && <span className="text-xs text-red-500 block">{errors.password.message}</span>}
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-[#09090b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#fafafa] text-[#18181b] hover:bg-[#fafafa]/90 h-10 px-4 py-2 mt-2"
                  >
                      {loading ? (
                         <div className="w-5 h-5 border-2 border-zinc-500 border-t-zinc-900 rounded-full animate-spin" />
                      ) : "Sign In"}
                  </button>
              </form>

              <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#27272a]"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#09090b] px-2 text-[#a1a1aa]">Or continue with</span></div>
              </div>

              {googleOAuthUrl && (
                <a 
                  href={googleOAuthUrl}
                  className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-[#09090b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fafafa] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-[#27272a] bg-white/5 hover:bg-white/10 hover:text-[#fafafa] h-10 px-4 py-2 gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                    Google
                </a>
              )}
              
              <div className="mt-6 text-center text-sm">
                  <span className="text-[#a1a1aa]">Don't have an account? </span>
                  <Link to="/register" className="font-medium text-[#fafafa] underline-offset-4 hover:underline">Sign up</Link>
              </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-[#a1a1aa]">
              <Link to="/" className="hover:text-[#fafafa] transition-colors flex items-center justify-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Back to Home
              </Link>
          </div>
      </div>
    </div>
  )
}
