export function DonatePage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl text-center">
      <h1 className="text-4xl font-bold mb-8">Support the Project</h1>
      <p className="text-gray-400 mb-8">Help fund AWS costs + beer 🍺</p>
      <div className="bg-gray-800 rounded-lg p-8 inline-block">
        <div className="w-64 h-64 bg-gray-700 rounded flex items-center justify-center">
          <span className="text-gray-500">Venmo QR Code</span>
        </div>
      </div>
    </div>
  );
}