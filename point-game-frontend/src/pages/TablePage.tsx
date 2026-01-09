import { useParams } from 'react-router-dom';

export function TablePage() {
  const { tableID } = useParams();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Table: {tableID}</h1>
      <p className="text-gray-400">Table implementation coming next...</p>
    </div>
  );
}