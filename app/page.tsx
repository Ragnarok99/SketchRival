import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-2">SketchRival</h1>
        <p className="text-center text-gray-600">
          ¡Dibuja y compite contra la IA o en salas multijugador!
        </p>
      </header>

      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-4xl">
        <div className="bg-white p-6 rounded-lg shadow-md w-full">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Navegación Principal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/gameRoom"
              className="bg-indigo-500 text-white py-3 px-4 rounded hover:bg-indigo-600 text-center"
            >
              Salas de Juego
            </Link>

            <Link
              href="/gameRoom/create"
              className="bg-pink-500 text-white py-3 px-4 rounded hover:bg-pink-600 text-center"
            >
              Crear Sala
            </Link>

            <Link
              href="/drawing"
              className="bg-blue-500 text-white py-3 px-4 rounded hover:bg-blue-600 text-center"
            >
              Canvas de Dibujo
            </Link>

            <Link
              href="/auth/login"
              className="bg-green-500 text-white py-3 px-4 rounded hover:bg-green-600 text-center"
            >
              Iniciar Sesión
            </Link>

            <Link
              href="/auth/register"
              className="bg-purple-500 text-white py-3 px-4 rounded hover:bg-purple-600 text-center"
            >
              Registrarse
            </Link>

            <Link
              href="/auth/forgot-password"
              className="bg-yellow-500 text-white py-3 px-4 rounded hover:bg-yellow-600 text-center"
            >
              Recuperar Contraseña
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md w-full">
          <h2 className="text-xl font-semibold mb-4 text-center">
            API Endpoints (Solo para desarrollo)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-100 rounded border text-sm">
              <span className="font-mono bg-gray-200 px-1">POST</span>{" "}
              /api/auth/login
            </div>

            <div className="p-3 bg-gray-100 rounded border text-sm">
              <span className="font-mono bg-gray-200 px-1">POST</span>{" "}
              /api/auth/register
            </div>

            <div className="p-3 bg-gray-100 rounded border text-sm">
              <span className="font-mono bg-gray-200 px-1">GET</span>{" "}
              /api/auth/google
            </div>

            <div className="p-3 bg-gray-100 rounded border text-sm">
              <span className="font-mono bg-gray-200 px-1">GET</span>{" "}
              /api/auth/me
            </div>

            <div className="p-3 bg-gray-100 rounded border text-sm">
              <span className="font-mono bg-gray-200 px-1">POST</span>{" "}
              /api/auth/forgot-password
            </div>

            <div className="p-3 bg-gray-100 rounded border text-sm">
              <span className="font-mono bg-gray-200 px-1">POST</span>{" "}
              /api/auth/reset-password/:token
            </div>

            <div className="p-3 bg-gray-100 rounded border text-sm">
              <span className="font-mono bg-gray-200 px-1">POST</span>{" "}
              /api/auth/refresh-token
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-4xl py-4 text-center text-gray-500 text-sm">
        <p>SketchRival - &copy; {new Date().getFullYear()}</p>
        <p className="mt-1">
          <Link href="/drawing" className="text-blue-500 hover:underline">
            ¡Empieza a dibujar ahora!
          </Link>
        </p>
      </footer>
    </div>
  );
}
