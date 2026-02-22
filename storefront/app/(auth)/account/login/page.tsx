import { retrieveCustomer } from "lib/medusa/customer";
import { redirect } from "next/navigation";
import { LoginForm } from "components/account/login-form";
import { AuthLayout } from "components/account/auth-layout";
import Link from "next/link";

export const metadata = {
  title: "Sign In",
};

export default async function LoginPage() {
  const customer = await retrieveCustomer();
  if (customer) redirect("/account");

  return (
    <AuthLayout
      heading="Sign in to your account"
      subtext={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/account/register"
            className="text-primary-600 hover:text-primary-500 font-semibold"
          >
            Create one
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
