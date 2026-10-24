import { RegisterForm } from "./register-form";

export const metadata = { title: "Daftar" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <RegisterForm next={next} />;
}
