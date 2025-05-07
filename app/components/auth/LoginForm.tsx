"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
// import { useRouter } from 'next/navigation'; // Para redirección

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      setMessage(data.message);
      // Aquí guardarías el token (ej. en localStorage o context) y redirigirías
      // localStorage.setItem('accessToken', data.accessToken);
      // localStorage.setItem('refreshToken', data.refreshToken);
      // router.push('/dashboard'); // Ejemplo de redirección
      console.log("Login successful", data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
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
      >
        Login
      </button>
      {message && <p className="text-blue-500">{message}</p>}
      {error && <p className="text-red-500">{error}</p>}

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
