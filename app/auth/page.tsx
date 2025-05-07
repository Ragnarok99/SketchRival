import RegisterForm from "../components/auth/RegisterForm";
import LoginForm from "../components/auth/LoginForm";

export default function AuthPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-8 text-center">Authentication</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <RegisterForm />
        </section>
        <section>
          <LoginForm />
        </section>
      </div>
    </div>
  );
}
