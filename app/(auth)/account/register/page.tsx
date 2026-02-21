import { retrieveCustomer } from "lib/medusa/customer";
import { redirect } from "next/navigation";
import { RegisterForm } from "components/account/register-form";
import { AuthLayout } from "components/account/auth-layout";
import Link from "next/link";

export const metadata = {
  title: "Create Account",
};

export default async function RegisterPage() {
  const customer = await retrieveCustomer();
  if (customer) redirect("/account");

  return (
    <AuthLayout
      heading="Create your account"
      subtext={
        <>
          Already have an account?{" "}
          <Link
            href="/account/login"
            className="font-semibold text-primary-600 hover:text-primary-500"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
