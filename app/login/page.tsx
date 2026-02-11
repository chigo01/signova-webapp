import { AuthForm } from "@/components/auth-form";
import Image from "next/image";

import Logo from "@/assets/icons/logos/Main-icon.svg";
import BackgroundLG from "@/assets/images/large-lines.svg";
import BackgroundSM from "@/assets/images/small-lines.svg";

export default function LoginPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="absolute top-5 left-10">
        <Image src={Logo} alt="Logo" className="h-16 w-16" />
      </div>
      <div className="mx-auto flex w-full flex-col justify-start space-y-6 sm:w-[500px]">
        <AuthForm type="login" />
      </div>
      <div className="absolute bottom-0 right-0">
        <Image
          src={BackgroundLG}
          alt="Background"
          className="hidden md:block"
        />
        <Image
          src={BackgroundSM}
          alt="Background"
          className="block md:hidden w-screen"
        />
      </div>
    </div>
  );
}
