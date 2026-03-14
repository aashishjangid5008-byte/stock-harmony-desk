import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Mail, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ForgotPasswordPage = () => {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent to your email!");
      setStep("reset");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">
        <div className="erp-card p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">We'll send you a reset link</p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Registered Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-success/10 mx-auto flex items-center justify-center">
                <KeyRound className="h-8 w-8 text-success" />
              </div>
              <p className="text-sm text-muted-foreground">
                Check your email for a password reset link. Click the link to set a new password.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
