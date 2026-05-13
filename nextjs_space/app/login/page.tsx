import LoginForm from "@/components/login-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
