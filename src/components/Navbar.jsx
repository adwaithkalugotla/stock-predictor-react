// src/components/Navbar.jsx
export default function Navbar() {
  return (
    <nav className="sticky top-0 z-20 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 shadow-md">
      <div className="flex items-center justify-center space-x-4">
        {/* circular white “badge” behind your logo, with a subtle shadow */}
        <div className="p-1 bg-white rounded-full shadow-sm dark:bg-gray-700">
          <img
            src="/logo.png"
            alt="SPP Logo"
            className="h-8 w-8 md:h-10 md:w-10 object-contain"
          />
        </div>

        {/* a little tighter tracking & responsive sizing */}
        <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight">
          Stock Price Predictor
        </h1>
      </div>
    </nav>
  );
}
