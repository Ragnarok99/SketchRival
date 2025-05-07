"use client";

import { useState, FormEvent } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      // Siempre mostrar el mismo mensaje independientemente de si
      // el email existe o no para evitar enumeración de cuentas
      setMessage(
        "Si tu correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.",
      );
    } catch (err) {
      // Error de red u otro error técnico
      setError(
        "Ha ocurrido un error al procesar tu solicitud. Inténtalo de nuevo más tarde.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
      <h2 className="text-xl font-bold">Recuperar Contraseña</h2>
      <p className="text-sm text-gray-600">
        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer
        tu contraseña.
      </p>
      <div>
        <label htmlFor="forgot-email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        {isSubmitting ? "Enviando..." : "Enviar instrucciones"}
      </button>
      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      <div className="text-center mt-4">
        <a href="/auth" className="text-blue-500 hover:underline">
          Volver al inicio de sesión
        </a>
      </div>
    </form>
  );
}
