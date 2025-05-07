"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validación simple del lado del cliente
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al restablecer la contraseña");
      }

      setMessage(
        "Contraseña restablecida con éxito. Serás redirigido al inicio de sesión...",
      );

      // Redireccionar al login después de un breve retraso
      setTimeout(() => {
        router.push("/auth");
      }, 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ha ocurrido un error inesperado");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
      <h2 className="text-xl font-bold">Establecer nueva contraseña</h2>
      <p className="text-sm text-gray-600">
        Crea una nueva contraseña segura para tu cuenta.
      </p>
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded mt-1"
          disabled={isSubmitting}
          minLength={6}
        />
        <p className="text-xs text-gray-500 mt-1">
          Debe tener al menos 6 caracteres
        </p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium">
          Confirmar contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full p-2 border rounded mt-1"
          disabled={isSubmitting}
        />
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Procesando..." : "Cambiar contraseña"}
      </button>
      {message && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
    </form>
  );
}
