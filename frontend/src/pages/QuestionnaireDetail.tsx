import { useParams } from 'react-router-dom';

export default function QuestionnaireDetail() {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Questionnaire Detail</h1>
      <p className="text-gray-600">
        Questionnaire ID: {id}
      </p>
    </div>
  );
}

