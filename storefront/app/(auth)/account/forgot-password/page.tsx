import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "components/account/auth-layout";
import { ForgotPasswordForm } from "components/account/forgot-password-form";
import { retrieveCustomer } from "lib/medusa/customer";

export const metadata = { title: "Forgot Password" };

export default async function ForgotPasswordPage() {
  const customer = await retrieveCustomer();
  if (customer) redirect("/account");
  return (
    <AuthLayout
      heading="Reset your password"
      subtext={
        <>
          Remember your password?{" "}
          <Link
            href="/account/login"
            className="text-primary-600 hover:text-primary-500 font-semibold"
          >
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
