import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

export default function AssessmentResult() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    api.get(`/assessments/${id}`)
      .then((r) => {
        setData(r.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading assessment result:', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading assessment result...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <p>Assessment result not found</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Kết quả đánh giá</h1>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Thông tin đánh giá</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">ID:</span> {data.id}
          </p>
          <p>
            <span className="font-medium">Ngày đánh giá:</span>{' '}
            {new Date(data.assessmentDate).toLocaleDateString('vi-VN')}
          </p>
          <p>
            <span className="font-medium">Kết luận:</span>{' '}
            <span className="font-semibold">{data.finalConclusion}</span>
          </p>
        </div>
      </div>

      {data.summaryResultJson && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Tổng kết điểm</h2>
          {data.summaryResultJson.domainTotals && (
            <div className="space-y-2">
              {Object.entries(data.summaryResultJson.domainTotals).map(
                ([domain, score]: [string, any]) => (
                  <div key={domain} className="flex justify-between">
                    <span className="font-medium">{domain}:</span>
                    <span className="font-semibold">{score} điểm</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Dữ liệu chi tiết (JSON)</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

