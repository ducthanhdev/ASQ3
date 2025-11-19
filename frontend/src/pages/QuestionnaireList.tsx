import { useEffect } from 'react';
import { api } from '../api/client';

export default function QuestionnaireList() {
  useEffect(() => {
    api.get("/questionnaires").then(r => console.log(r.data));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Questionnaires</h1>
      <p className="text-gray-600">
        Check console for API response
      </p>
    </div>
  );
}

