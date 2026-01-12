import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="container relative flex h-[800px] flex-col items-center justify-center md:grid lg:max-w-none lg:px-0">
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <AuthForm type="login" />
        </div>
      </div>
    </div>
  );
}
