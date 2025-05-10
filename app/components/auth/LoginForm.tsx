"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useAuth } from "../../auth/AuthContext";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { login, loading, error: authError } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const success = await login(email, password);
      
      if (success) {
        setMessage("Inicio de sesión exitoso. Redirigiendo...");
        router.push('/gameRoom'); // Redirigir a la página de salas de juego
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
      <h2>Login</h2>
      <div>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Enlace a recuperación de contraseña */}
      <div className="text-right">
        <Link
          href="/auth/forgot-password"
          className="text-sm text-blue-500 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
            Cargando...
          </span>
        ) : (
          "Login"
        )}
      </button>
      
      {message && <p className="text-blue-500">{message}</p>}
      {(error || authError) && <p className="text-red-500">{error || authError}</p>}

      <div className="mt-4">
        <p>Login with Google:</p>
        <a
          href="/api/auth/google"
          className="px-4 py-2 border rounded hover:bg-gray-100 inline-block"
        >
          Sign in with Google
        </a>
      </div>
    </form>
  );
}
