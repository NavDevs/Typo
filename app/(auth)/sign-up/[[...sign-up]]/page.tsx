import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0b1326] via-[#111833] to-[#1c133a] opacity-50" />
      
      {/* Decorative ambient light sources */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-600/20 blur-[128px]" />

      <div className="relative z-10 w-full max-w-md">
        <SignUp
          appearance={{
            elements: {
              card: "glass-panel p-8 w-full shadow-2xl bg-[#0b1326]/40",
              headerTitle: "text-2xl font-bold text-white tracking-tight",
              headerSubtitle: "text-indigo-200/70",
              socialButtonsBlockButton: "glass-input hover:bg-white/10 border-indigo-500/30",
              socialButtonsBlockButtonText: "text-white font-medium",
              formButtonPrimary: "glass-button shadow-indigo-500/20",
              formFieldInput: "glass-input focus:ring-2 focus:ring-indigo-500/50 bg-[#000000]/40",
              formFieldLabel: "text-indigo-100/80 font-medium",
              footerActionLink: "text-indigo-400 hover:text-indigo-300 font-semibold",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-indigo-400 hover:text-indigo-300",
              formFieldSuccessText: "text-emerald-400",
              formFieldErrorText: "text-rose-400",
              dividerLine: "bg-indigo-500/20",
              dividerText: "text-indigo-200/50",
            },
            variables: {
              colorPrimary: "#6366f1",
              colorText: "white",
              colorBackground: "transparent",
              colorInputBackground: "rgba(0, 0, 0, 0.4)",
              colorInputText: "white",
              borderRadius: "12px",
            }
          }}
        />
      </div>
    </div>
  );
}
