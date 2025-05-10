import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4">
      {/* El alto es 100vh menos la altura del navbar (asumiendo 4rem/64px) */}
      
      {/* Opcional: Logo o imagen temática */}
      {/* <Image src="/logo-grande.png" alt="SketchRival Logo" width={200} height={200} className="mb-8" /> */}

      <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
        Bienvenido a <span className="text-indigo-600">SketchRival</span>
      </h1>
      <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl">
        ¡Desafía tu creatividad dibujando y adivinando! Juega en salas multijugador o prueba tus habilidades contra la IA.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-md md:max-w-lg">
        <Link
          href="/gameRoom"
          className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-transform transform hover:scale-105 shadow-lg"
        >
          Buscar Partida
        </Link>
        <Link
          href="/gameRoom/create"
          className="w-full bg-pink-500 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-pink-600 transition-transform transform hover:scale-105 shadow-lg"
        >
          Crear Sala
        </Link>
      </div>

      <div className="mt-12">
        <Link href="/leaderboards" className="text-indigo-600 hover:text-indigo-700 underline text-md">
          Ver Tablas de Clasificación
        </Link>
      </div>
      
      {/* 
        Podríamos añadir otras secciones aquí:
        - Cómo Jugar
        - Características destacadas
      */}
      
    </div>
  );
}
