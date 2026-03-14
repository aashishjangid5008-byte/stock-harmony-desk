import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const signupSchema = z.object({
  loginId: z.string().min(6, "Login ID must be at least 6 characters").max(12, "Login ID must be at most 12 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least 1 uppercase letter")
    .regex(/[a-z]/, "Must contain at least 1 lowercase letter")
    .regex(/[^a-zA-Z0-9]/, "Must contain at least 1 special character"),
});

const SignupPage = () => {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({ loginId, email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { login_id: loginId, display_name: loginId },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Email is already registered");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Account created! Please log in.");
      navigate("/login");
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
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Join CoreInventory</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginId">Login ID</Label>
              <Input
                id="loginId"
                placeholder="6-12 characters"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
              />
              {errors.loginId && <p className="text-xs text-destructive">{errors.loginId}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 chars, uppercase, lowercase, special"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline font-medium">
              Already have an account? Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
