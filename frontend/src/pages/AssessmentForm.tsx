import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { api } from '../api/client';

export default function AssessmentForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [questionnaireVersionId, setQuestionnaireVersionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [childId, setChildId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    api.get(`/questionnaires/${id}/version/latest`)
      .then((res) => {
        setQuestionnaire(res.data.structureJson);
        setQuestionnaireVersionId(res.data.id);
      })
      .catch((err) => {
        console.error('Error loading questionnaire:', err);
      });

    api.get('/children')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setChildId(res.data[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading children:', err);
        setLoading(false);
      });
  }, [id]);

  const submitForm = async () => {
    if (!questionnaireVersionId) {
      alert('Questionnaire version not loaded');
      return;
    }

    if (!childId) {
      alert('Child not selected. Please ensure you have at least one child in the system.');
      return;
    }

    const payload = {
      childId: childId,
      questionnaireVersionId: questionnaireVersionId,
      answers: answers,
    };

    try {
      const res = await api.post('/assessments', payload);
      navigate(`/assessment/${res.data.id}`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Failed to submit assessment');
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading questionnaire...</p>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="p-4">
        <p>Questionnaire not found</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ASQ Assessment</h1>

      {questionnaire.domains?.map((domain: any) => (
        <div key={domain.key} className="p-4 border rounded mb-4 bg-white">
          <h2 className="font-bold text-lg mb-4">{domain.title}</h2>
          {domain.questions?.map((q: any) => (
            <div key={q.id} className="mb-6">
              <p className="font-medium mb-3">
                {q.sort_order}. {q.text}
              </p>
              <RadioGroup.Root
                onValueChange={(v) =>
                  setAnswers((prev: any) => ({ ...prev, [q.id]: v }))
                }
                value={answers[q.id] || ''}
                className="flex gap-4"
              >
                <div className="flex items-center">
                  <RadioGroup.Item
                    value="Y"
                    id={`${q.id}-Y`}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  >
                    <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                  </RadioGroup.Item>
                  <label
                    htmlFor={`${q.id}-Y`}
                    className="ml-2 cursor-pointer"
                  >
                    Có
                  </label>
                </div>
                <div className="flex items-center">
                  <RadioGroup.Item
                    value="S"
                    id={`${q.id}-S`}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  >
                    <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                  </RadioGroup.Item>
                  <label
                    htmlFor={`${q.id}-S`}
                    className="ml-2 cursor-pointer"
                  >
                    Đôi khi
                  </label>
                </div>
                <div className="flex items-center">
                  <RadioGroup.Item
                    value="N"
                    id={`${q.id}-N`}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  >
                    <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-white" />
                  </RadioGroup.Item>
                  <label
                    htmlFor={`${q.id}-N`}
                    className="ml-2 cursor-pointer"
                  >
                    Chưa
                  </label>
                </div>
              </RadioGroup.Root>
            </div>
          ))}
        </div>
      ))}

      <div className="mt-6 flex justify-end">
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          onClick={submitForm}
        >
          Nộp bài
        </button>
      </div>
    </div>
  );
}

